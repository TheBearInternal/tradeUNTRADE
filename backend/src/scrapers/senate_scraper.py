"""
Senate Financial Disclosure Scraper
Scrapes Periodic Transaction Reports from Senate efd search
Source: https://efdsearch.senate.gov/search/
"""

import requests
from bs4 import BeautifulSoup
import time
import os
import logging
from datetime import datetime, timedelta
import re

from database import (
    find_or_create_politician,
    find_or_create_asset,
    insert_transaction,
    create_scraper_run,
    update_scraper_run
)
from pdf_parser import (
    parse_date,
    parse_amount_range,
    extract_ticker,
    normalize_transaction_type,
    extract_tables_from_pdf
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SENATE_BASE_URL = "https://efdsearch.senate.gov"
USER_AGENT = os.getenv('SCRAPER_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
DELAY_MS = int(os.getenv('SCRAPER_DELAY_MS', 2000))
DOWNLOAD_DIR = './downloads/senate'

# Create download directory
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

class SenateScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        })
        self.stats = {
            'filings_found': 0,
            'filings_processed': 0,
            'transactions_extracted': 0,
            'transactions_saved': 0,
            'errors_count': 0
        }

    def delay(self):
        """Respectful delay between requests"""
        time.sleep(DELAY_MS / 1000.0)

    def scrape_recent_disclosures(self, days_back=7):
        """
        Scrape recent Senate periodic transaction reports

        Args:
            days_back: Number of days to look back

        Returns:
            Number of transactions saved
        """
        logger.info(f"Starting Senate disclosure scrape for last {days_back} days")

        run_id = create_scraper_run('senate')

        try:
            # Senate EFD search interface
            search_url = f"{SENATE_BASE_URL}/search/"

            logger.info(f"Accessing Senate EFD search: {search_url}")

            # The Senate site has a search form that requires specific parameters
            # This is a simplified example - actual implementation would need to:
            # 1. Parse the search form
            # 2. Submit with appropriate parameters for PTRs
            # 3. Handle pagination
            # 4. Extract results

            search_params = {
                'report_type': 'ptr',  # Periodic Transaction Report
                'submitted_start_date': (datetime.now() - timedelta(days=days_back)).strftime('%m/%d/%Y'),
                'submitted_end_date': datetime.now().strftime('%m/%d/%Y'),
            }

            response = self.session.post(
                f"{SENATE_BASE_URL}/search/report/",
                data=search_params,
                timeout=30
            )

            self.delay()

            # Parse results
            soup = BeautifulSoup(response.content, 'html.parser')

            # Find report links (adjust selector based on actual HTML)
            report_rows = soup.find_all('tr', class_=re.compile(r'report', re.I))

            self.stats['filings_found'] = len(report_rows)
            logger.info(f"Found {len(report_rows)} Senate PTR filings")

            # Process each filing
            for row in report_rows[:50]:  # Limit to first 50
                try:
                    self.process_filing_row(row, run_id)
                    self.delay()
                except Exception as e:
                    logger.error(f"Error processing filing row: {e}")
                    self.stats['errors_count'] += 1
                    continue

            # Update scraper run
            update_scraper_run(run_id, 'completed', self.stats)

            logger.info(f"Senate scrape completed. Saved {self.stats['transactions_saved']} transactions")
            return self.stats['transactions_saved']

        except Exception as e:
            logger.error(f"Senate scraper failed: {e}")
            update_scraper_run(run_id, 'failed', self.stats, str(e))
            raise

    def process_filing_row(self, row, run_id):
        """
        Process a single filing row from search results

        Args:
            row: BeautifulSoup row element
            run_id: Scraper run ID
        """
        # Extract senator name and filing link
        cells = row.find_all('td')
        if len(cells) < 3:
            return

        senator_name = cells[0].get_text().strip()
        filing_link = cells[1].find('a')

        if not filing_link:
            return

        filing_url = filing_link.get('href')
        if not filing_url.startswith('http'):
            filing_url = SENATE_BASE_URL + filing_url

        logger.info(f"Processing Senate filing for {senator_name}: {filing_url}")

        # Access filing detail page
        response = self.session.get(filing_url, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Senate filings often have structured HTML tables (better than PDF parsing)
        # Look for transaction table
        self.parse_and_save_html_transactions(soup, senator_name, filing_url)

        self.stats['filings_processed'] += 1

    def parse_and_save_html_transactions(self, soup, senator_name, filing_url):
        """
        Parse transactions from Senate HTML disclosure page

        Senate disclosures are often in HTML tables, which is easier than PDF parsing

        Args:
            soup: BeautifulSoup object of filing page
            senator_name: Name of senator
            filing_url: URL of filing
        """
        try:
            # Find transaction table (adjust selector based on actual HTML)
            txn_table = soup.find('table', {'id': re.compile(r'transaction', re.I)})

            if not txn_table:
                # Try alternative selectors
                txn_table = soup.find('table', class_=re.compile(r'transaction', re.I))

            if not txn_table:
                logger.warning(f"No transaction table found for {senator_name}")
                return

            # Parse table rows
            rows = txn_table.find_all('tr')[1:]  # Skip header

            transactions = []
            for row in rows:
                cells = row.find_all('td')
                if len(cells) < 4:
                    continue

                # Extract transaction data (column indices would need adjustment)
                # Typical Senate disclosure format:
                # Date | Asset | Type | Amount
                try:
                    date_str = cells[0].get_text().strip()
                    asset_str = cells[1].get_text().strip()
                    type_str = cells[2].get_text().strip()
                    amount_str = cells[3].get_text().strip()

                    transaction = {
                        'transaction_date': parse_date(date_str),
                        'asset_description': asset_str,
                        'ticker': extract_ticker(asset_str),
                        'transaction_type': normalize_transaction_type(type_str),
                        'amount_min': None,
                        'amount_max': None,
                        'amount_range_code': None
                    }

                    # Parse amount
                    amount_min, amount_max, range_code = parse_amount_range(amount_str)
                    transaction['amount_min'] = amount_min
                    transaction['amount_max'] = amount_max
                    transaction['amount_range_code'] = range_code

                    # Calculate confidence
                    confidence = 0.6  # Senate data tends to be more structured
                    if transaction['ticker']:
                        confidence += 0.2
                    if transaction['transaction_type']:
                        confidence += 0.1
                    if transaction['transaction_date']:
                        confidence += 0.1

                    transaction['confidence_score'] = min(confidence, 1.0)
                    transaction['manual_review_needed'] = confidence < 0.7

                    transactions.append(transaction)

                except Exception as e:
                    logger.error(f"Error parsing transaction row: {e}")
                    continue

            self.stats['transactions_extracted'] += len(transactions)

            if not transactions:
                logger.warning(f"No transactions extracted for {senator_name}")
                return

            # Get or create politician
            politician_id = find_or_create_politician(
                full_name=senator_name,
                office='senate',
                party=None,  # Would need to extract
                state=None   # Would need to extract
            )

            # Extract filing ID
            filing_id_match = re.search(r'(\d+)', filing_url)
            filing_id = filing_id_match.group(1) if filing_id_match else None

            # Save transactions
            saved_count = 0
            for txn in transactions:
                try:
                    # Get or create asset
                    asset_id = None
                    if txn.get('ticker'):
                        asset_id = find_or_create_asset(
                            ticker=txn['ticker'],
                            asset_name=txn.get('asset_description')
                        )

                    # Prepare transaction data
                    transaction_data = {
                        'politician_id': politician_id,
                        'asset_id': asset_id,
                        'transaction_type': txn.get('transaction_type'),
                        'transaction_date': txn.get('transaction_date'),
                        'filing_date': datetime.now().date(),
                        'amount_min': txn.get('amount_min'),
                        'amount_max': txn.get('amount_max'),
                        'amount_range_code': txn.get('amount_range_code'),
                        'asset_description': txn.get('asset_description'),
                        'comment': None,
                        'source': 'senate_ptr',
                        'filing_id': filing_id,
                        'filing_url': filing_url,
                        'confidence_score': txn.get('confidence_score', 0.6),
                        'manual_review_needed': txn.get('manual_review_needed', False)
                    }

                    # Insert transaction
                    txn_id = insert_transaction(transaction_data)
                    if txn_id:
                        saved_count += 1

                except Exception as e:
                    logger.error(f"Error saving transaction: {e}")
                    self.stats['errors_count'] += 1
                    continue

            self.stats['transactions_saved'] += saved_count
            logger.info(f"Saved {saved_count}/{len(transactions)} transactions from {senator_name}")

        except Exception as e:
            logger.error(f"Error parsing Senate transactions: {e}")
            self.stats['errors_count'] += 1

def run_senate_scraper(days_back=7):
    """
    Main entry point for Senate scraper

    Args:
        days_back: Number of days to look back

    Returns:
        Number of transactions saved
    """
    scraper = SenateScraper()
    return scraper.scrape_recent_disclosures(days_back)

if __name__ == '__main__':
    # Run scraper
    run_senate_scraper()
