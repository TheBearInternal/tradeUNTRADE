"""
Main scraper orchestration script
Runs House and Senate scrapers on a schedule
"""

import logging
import time
import os
import sys
from datetime import datetime

from house_scraper import run_house_scraper
from senate_scraper import run_senate_scraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scraper.log')
    ]
)

logger = logging.getLogger(__name__)

def run_all_scrapers(days_back=7):
    """
    Run all scrapers sequentially

    Args:
        days_back: Number of days to look back for filings

    Returns:
        Dictionary with results from each scraper
    """
    logger.info("=" * 80)
    logger.info(f"Starting scraper run at {datetime.now()}")
    logger.info("=" * 80)

    results = {
        'house': 0,
        'senate': 0,
        'total': 0,
        'errors': []
    }

    # Run House scraper
    try:
        logger.info("Starting House scraper...")
        house_count = run_house_scraper(days_back)
        results['house'] = house_count
        logger.info(f"House scraper completed: {house_count} transactions")
    except Exception as e:
        logger.error(f"House scraper failed: {e}")
        results['errors'].append(f"House: {str(e)}")

    # Delay between scrapers
    time.sleep(5)

    # Run Senate scraper
    try:
        logger.info("Starting Senate scraper...")
        senate_count = run_senate_scraper(days_back)
        results['senate'] = senate_count
        logger.info(f"Senate scraper completed: {senate_count} transactions")
    except Exception as e:
        logger.error(f"Senate scraper failed: {e}")
        results['errors'].append(f"Senate: {str(e)}")

    # Calculate total
    results['total'] = results['house'] + results['senate']

    logger.info("=" * 80)
    logger.info(f"Scraper run completed at {datetime.now()}")
    logger.info(f"Total transactions saved: {results['total']}")
    logger.info(f"  - House: {results['house']}")
    logger.info(f"  - Senate: {results['senate']}")
    if results['errors']:
        logger.warning(f"Errors: {len(results['errors'])}")
        for error in results['errors']:
            logger.warning(f"  - {error}")
    logger.info("=" * 80)

    return results

def run_continuous(interval_minutes=30):
    """
    Run scrapers continuously on a schedule

    Args:
        interval_minutes: Minutes between scraper runs
    """
    logger.info(f"Starting continuous scraper mode (interval: {interval_minutes} minutes)")

    while True:
        try:
            # Run all scrapers
            run_all_scrapers(days_back=1)  # Look back 1 day for continuous mode

            # Wait for next run
            logger.info(f"Waiting {interval_minutes} minutes until next run...")
            time.sleep(interval_minutes * 60)

        except KeyboardInterrupt:
            logger.info("Scraper stopped by user")
            break
        except Exception as e:
            logger.error(f"Unexpected error in continuous mode: {e}")
            # Wait a bit before retrying
            time.sleep(60)

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Congressional Trading Scraper')
    parser.add_argument(
        '--mode',
        choices=['once', 'continuous'],
        default='once',
        help='Run mode: once (single run) or continuous (scheduled)'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Number of days to look back for filings (default: 7)'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=30,
        help='Minutes between runs in continuous mode (default: 30)'
    )
    parser.add_argument(
        '--source',
        choices=['house', 'senate', 'all'],
        default='all',
        help='Which source to scrape (default: all)'
    )

    args = parser.parse_args()

    if args.mode == 'once':
        # Single run
        if args.source == 'house':
            run_house_scraper(args.days)
        elif args.source == 'senate':
            run_senate_scraper(args.days)
        else:
            run_all_scrapers(args.days)
    else:
        # Continuous mode
        run_continuous(args.interval)

if __name__ == '__main__':
    main()
