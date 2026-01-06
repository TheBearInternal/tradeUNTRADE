"""
House Financial Disclosure Scraper
Scrapes Periodic Transaction Reports (PTRs) from House Clerk website
Source: https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure
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
from pdf_parser import parse_house_ptr_pdf, calculate_confidence_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
HOUSE_BASE_URL = "https://disclosures-clerk.house.gov"
USER_AGENT = os.getenv('SCRAPER_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
DELAY_MS = int(os.getenv('SCRAPER_DELAY_MS', 2000))
DOWNLOAD_DIR = './downloads/house'

# Create download directory
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

class HouseScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
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

    def scrape_recent_ptrs(self, days_back=7):
        """
        Scrape recent PTR filings

        Args:
            days_back: Number of days to look back

        Returns:
            Number of transactions saved
        """
        logger.info(f"Starting House PTR scrape for last {days_back} days")

        run_id = create_scraper_run('house')

        try:
            # House disclosure website structure (this is a simplified example)
            # In reality, you would need to:
            # 1. Navigate to the search interface
            # 2. Submit search form for PTRs
            # 3. Parse results table
            # 4. Download PDF links
            # 5. Parse PDFs

            # Example: Search for recent PTRs
            search_url = f"{HOUSE_BASE_URL}/PublicDisclosure/FinancialDisclosure"

            logger.info(f"Fetching: {search_url}")
            response = self.session.get(search_url, timeout=30)
            response.raise_for_status()

            self.delay()

            # Parse search results
            soup = BeautifulSoup(response.content, 'html.parser')

            # Find PTR filing links (this selector would need to be adjusted based on actual HTML)
            # This is a placeholder implementation
            filing_links = soup.find_all('a', href=re.compile(r'ptr', re.I))

            self.stats['filings_found'] = len(filing_links)
            logger.info(f"Found {len(filing_links)} potential PTR filings")

            # Process each filing
            for link in filing_links[:50]:  # Limit to first 50 for now
                try:
                    self.process_filing_link(link, run_id)
                    self.delay()
                except Exception as e:
                    logger.error(f"Error processing filing: {e}")
                    self.stats['errors_count'] += 1
                    continue

            # Update scraper run
            update_scraper_run(run_id, 'completed', self.stats)

            logger.info(f"House scrape completed. Saved {self.stats['transactions_saved']} transactions")
            return self.stats['transactions_saved']

        except Exception as e:
            logger.error(f"House scraper failed: {e}")
            update_scraper_run(run_id, 'failed', self.stats, str(e))
            raise

    def process_filing_link(self, link, run_id):
        """
        Process a single filing link

        Args:
            link: BeautifulSoup link element
            run_id: Scraper run ID
        """
        filing_url = link.get('href')
        if not filing_url:
            return

        # Make absolute URL
        if not filing_url.startswith('http'):
            filing_url = HOUSE_BASE_URL + filing_url

        logger.info(f"Processing filing: {filing_url}")

        # Extract metadata from page
        response = self.session.get(filing_url, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract politician name (would need to adjust selector)
        politician_name = self.extract_politician_name(soup)
        if not politician_name:
            logger.warning(f"Could not extract politician name from {filing_url}")
            return

        # Find PDF download link
        pdf_link = soup.find('a', href=re.compile(r'\.pdf$', re.I))
        if not pdf_link:
            logger.warning(f"No PDF found for {filing_url}")
            return

        pdf_url = pdf_link.get('href')
        if not pdf_url.startswith('http'):
            pdf_url = HOUSE_BASE_URL + pdf_url

        # Download and parse PDF
        pdf_path = self.download_pdf(pdf_url, politician_name)
        if pdf_path:
            self.parse_and_save_transactions(pdf_path, politician_name, filing_url)
            self.stats['filings_processed'] += 1

    def extract_politician_name(self, soup):
        """
        Extract politician name from filing page

        Args:
            soup: BeautifulSoup object

        Returns:
            Politician name string
        """
        # This would need to be adjusted based on actual HTML structure
        # Example selectors:
        name_elem = soup.find('h1') or soup.find('h2') or soup.find(class_='filer-name')

        if name_elem:
            name = name_elem.get_text().strip()
            # Clean up name
            name = re.sub(r'\s+', ' ', name)
            name = name.replace('Hon.', '').replace('Rep.', '').strip()
            return name

        return None

    def download_pdf(self, pdf_url, politician_name):
        """
        Download PDF file

        Args:
            pdf_url: URL of PDF
            politician_name: Name for filename

        Returns:
            Path to downloaded file or None
        """
        try:
            logger.info(f"Downloading PDF: {pdf_url}")

            response = self.session.get(pdf_url, timeout=60)
            response.raise_for_status()

            # Generate filename
            safe_name = re.sub(r'[^\w\s-]', '', politician_name).strip().replace(' ', '_')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{safe_name}_{timestamp}.pdf"
            filepath = os.path.join(DOWNLOAD_DIR, filename)

            # Save PDF
            with open(filepath, 'wb') as f:
                f.write(response.content)

            logger.info(f"Downloaded: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"Error downloading PDF {pdf_url}: {e}")
            return None

    def parse_and_save_transactions(self, pdf_path, politician_name, filing_url):
        """
        Parse PDF and save transactions to database

        Args:
            pdf_path: Path to PDF file
            politician_name: Name of politician
            filing_url: URL of original filing
        """
        try:
            # Parse PDF
            transactions = parse_house_ptr_pdf(pdf_path)
            self.stats['transactions_extracted'] += len(transactions)

            if not transactions:
                logger.warning(f"No transactions found in {pdf_path}")
                return

            # Get or create politician
            politician_id = find_or_create_politician(
                full_name=politician_name,
                office='house',
                party=None,  # Would need to extract from filing
                state=None   # Would need to extract from filing
            )

            # Extract filing ID from URL
            filing_id_match = re.search(r'(\d+)', filing_url)
            filing_id = filing_id_match.group(1) if filing_id_match else None

            # Save transactions
            saved_count = 0
            for txn in transactions:
                try:
                    # Get or create asset if ticker exists
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
                        'filing_date': datetime.now().date(),  # Would extract from filing
                        'amount_min': txn.get('amount_min'),
                        'amount_max': txn.get('amount_max'),
                        'amount_range_code': txn.get('amount_range_code'),
                        'asset_description': txn.get('asset_description'),
                        'comment': None,
                        'source': 'house_ptr',
                        'filing_id': filing_id,
                        'filing_url': filing_url,
                        'confidence_score': txn.get('confidence_score', 0.5),
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
            logger.info(f"Saved {saved_count}/{len(transactions)} transactions from {politician_name}")

        except Exception as e:
            logger.error(f"Error parsing {pdf_path}: {e}")
            self.stats['errors_count'] += 1

def run_house_scraper(days_back=7):
    """
    Main entry point for House scraper

    Args:
        days_back: Number of days to look back

    Returns:
        Number of transactions saved
    """
    scraper = HouseScraper()
    return scraper.scrape_recent_ptrs(days_back)

if __name__ == '__main__':
    # Run scraper
    run_house_scraper()
