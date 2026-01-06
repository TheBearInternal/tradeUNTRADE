"""
PDF parsing utilities for congressional financial disclosures
Extracts transaction data from PDF filings using pdfplumber
"""

import pdfplumber
import re
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Regex patterns for parsing
TICKER_PATTERN = re.compile(r'\(([A-Z]{1,5})\)')
AMOUNT_PATTERN = re.compile(r'\$?([\d,]+)\s*-\s*\$?([\d,]+)')
DATE_PATTERN = re.compile(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})')

# Amount range mappings (common in congressional disclosures)
AMOUNT_RANGES = {
    'A': (1, 1000),
    'B': (1001, 15000),
    'C': (15001, 50000),
    'D': (50001, 100000),
    'E': (100001, 250000),
    'F': (250001, 500000),
    'G': (500001, 1000000),
    'H': (1000001, 5000000),
    'I': (5000001, 25000000),
    'J': (25000001, 50000000),
    'K': (50000001, float('inf'))
}

def parse_amount_range(amount_str):
    """
    Parse amount range from string

    Args:
        amount_str: Amount string like "$15,001 - $50,000" or "C"

    Returns:
        Tuple of (min_amount, max_amount, range_code)
    """
    if not amount_str:
        return None, None, None

    amount_str = str(amount_str).strip()

    # Check if it's a range code (A-K)
    if len(amount_str) == 1 and amount_str.upper() in AMOUNT_RANGES:
        code = amount_str.upper()
        min_amt, max_amt = AMOUNT_RANGES[code]
        return min_amt, max_amt if max_amt != float('inf') else None, code

    # Try to parse numeric range
    match = AMOUNT_PATTERN.search(amount_str)
    if match:
        min_str, max_str = match.groups()
        min_amt = int(min_str.replace(',', ''))
        max_amt = int(max_str.replace(',', ''))

        # Determine range code
        range_code = None
        for code, (r_min, r_max) in AMOUNT_RANGES.items():
            if min_amt >= r_min and (r_max == float('inf') or min_amt <= r_max):
                range_code = code
                break

        return min_amt, max_amt, range_code

    return None, None, None

def parse_date(date_str):
    """
    Parse date from various formats

    Args:
        date_str: Date string in various formats

    Returns:
        datetime object or None
    """
    if not date_str:
        return None

    date_str = str(date_str).strip()

    # Try common date formats
    formats = [
        '%m/%d/%Y',
        '%m-%d-%Y',
        '%m/%d/%y',
        '%m-%d-%y',
        '%Y-%m-%d',
        '%B %d, %Y',
        '%b %d, %Y'
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # Try regex parsing
    match = DATE_PATTERN.search(date_str)
    if match:
        month, day, year = match.groups()
        year = int(year)
        if year < 100:
            year += 2000 if year < 50 else 1900

        try:
            return datetime(year, int(month), int(day))
        except ValueError:
            pass

    logger.warning(f"Could not parse date: {date_str}")
    return None

def extract_ticker(text):
    """
    Extract ticker symbol from text

    Args:
        text: Text containing potential ticker

    Returns:
        Ticker symbol or None
    """
    if not text:
        return None

    # Look for ticker in parentheses
    match = TICKER_PATTERN.search(text)
    if match:
        return match.group(1).upper()

    # Look for standalone capital letters 1-5 chars
    words = text.split()
    for word in words:
        word = word.strip('()[]{}.,;:')
        if word.isupper() and 1 <= len(word) <= 5 and word.isalpha():
            return word

    return None

def normalize_transaction_type(type_str):
    """
    Normalize transaction type to standard values

    Args:
        type_str: Raw transaction type string

    Returns:
        'purchase', 'sale', or 'exchange'
    """
    if not type_str:
        return None

    type_str = type_str.lower().strip()

    if 'purch' in type_str or 'buy' in type_str or 'acquisition' in type_str:
        return 'purchase'
    elif 'sale' in type_str or 'sell' in type_str or 'sold' in type_str:
        return 'sale'
    elif 'exchange' in type_str:
        return 'exchange'

    return None

def extract_text_from_pdf(pdf_path):
    """
    Extract all text from PDF

    Args:
        pdf_path: Path to PDF file

    Returns:
        Extracted text as string
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ''
            for page in pdf.pages:
                text += page.extract_text() or ''
            return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
        return ''

def extract_tables_from_pdf(pdf_path):
    """
    Extract tables from PDF

    Args:
        pdf_path: Path to PDF file

    Returns:
        List of tables (each table is list of rows)
    """
    tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)
        return tables
    except Exception as e:
        logger.error(f"Error extracting tables from PDF {pdf_path}: {e}")
        return []

def parse_house_ptr_table(table):
    """
    Parse House PTR (Periodic Transaction Report) table

    Args:
        table: Table extracted from PDF (list of rows)

    Returns:
        List of transaction dictionaries
    """
    transactions = []

    if not table or len(table) < 2:
        return transactions

    # Try to identify column headers
    headers = table[0]
    header_indices = {
        'asset': -1,
        'type': -1,
        'date': -1,
        'amount': -1,
        'ticker': -1
    }

    # Find column indices by header keywords
    for i, header in enumerate(headers):
        if not header:
            continue
        header_lower = str(header).lower()
        if 'asset' in header_lower or 'security' in header_lower or 'description' in header_lower:
            header_indices['asset'] = i
        elif 'type' in header_lower or 'transaction' in header_lower:
            header_indices['type'] = i
        elif 'date' in header_lower:
            header_indices['date'] = i
        elif 'amount' in header_lower or 'value' in header_lower:
            header_indices['amount'] = i

    # Parse data rows
    for row in table[1:]:
        if not row or len(row) == 0:
            continue

        try:
            # Extract fields
            asset_desc = row[header_indices['asset']] if header_indices['asset'] >= 0 and len(row) > header_indices['asset'] else ''
            txn_type = row[header_indices['type']] if header_indices['type'] >= 0 and len(row) > header_indices['type'] else ''
            date_str = row[header_indices['date']] if header_indices['date'] >= 0 and len(row) > header_indices['date'] else ''
            amount_str = row[header_indices['amount']] if header_indices['amount'] >= 0 and len(row) > header_indices['amount'] else ''

            # Skip empty rows
            if not asset_desc and not txn_type:
                continue

            # Parse fields
            ticker = extract_ticker(str(asset_desc))
            transaction_type = normalize_transaction_type(str(txn_type))
            transaction_date = parse_date(str(date_str))
            amount_min, amount_max, range_code = parse_amount_range(str(amount_str))

            # Calculate confidence score
            confidence = 0.5
            if ticker:
                confidence += 0.2
            if transaction_type:
                confidence += 0.2
            if transaction_date:
                confidence += 0.1

            transaction = {
                'asset_description': str(asset_desc).strip() if asset_desc else None,
                'ticker': ticker,
                'transaction_type': transaction_type,
                'transaction_date': transaction_date,
                'amount_min': amount_min,
                'amount_max': amount_max,
                'amount_range_code': range_code,
                'confidence_score': min(confidence, 1.0),
                'manual_review_needed': confidence < 0.7
            }

            transactions.append(transaction)

        except Exception as e:
            logger.error(f"Error parsing table row: {e}")
            continue

    return transactions

def parse_house_ptr_pdf(pdf_path):
    """
    Parse complete House PTR PDF

    Args:
        pdf_path: Path to PDF file

    Returns:
        List of parsed transactions
    """
    logger.info(f"Parsing House PTR PDF: {pdf_path}")

    all_transactions = []

    # Extract tables
    tables = extract_tables_from_pdf(pdf_path)

    for table in tables:
        transactions = parse_house_ptr_table(table)
        all_transactions.extend(transactions)

    # If no tables found, try text extraction (less reliable)
    if not all_transactions:
        logger.warning(f"No tables found in {pdf_path}, attempting text extraction")
        text = extract_text_from_pdf(pdf_path)
        # Could implement text-based parsing here if needed

    logger.info(f"Extracted {len(all_transactions)} transactions from {pdf_path}")
    return all_transactions

def calculate_confidence_score(transaction):
    """
    Calculate confidence score for a transaction

    Args:
        transaction: Transaction dictionary

    Returns:
        Float between 0 and 1
    """
    score = 0.3  # Base score

    if transaction.get('ticker'):
        score += 0.2
    if transaction.get('transaction_type'):
        score += 0.2
    if transaction.get('transaction_date'):
        score += 0.15
    if transaction.get('amount_min') or transaction.get('amount_max'):
        score += 0.15

    return min(score, 1.0)
