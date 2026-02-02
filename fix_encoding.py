#!/usr/bin/env python3
"""
Fix encoding issues (mojibake) in HTML files.
These are UTF-8 characters that were double-encoded or misinterpreted.
"""

import os
import glob

# Common mojibake patterns and their correct replacements
REPLACEMENTS = {
    # Copyright symbol
    'Ã‚Â©': '©',
    'Â©': '©',
    # Non-breaking space
    'Ã‚Â ': ' ',
    'Â ': ' ',
    # Right single quote / apostrophe
    'Ã¢â‚¬â„¢': "'",
    # Left single quote
    'Ã¢â‚¬Ëœ': "'",
    # Right double quote
    'Ã¢â‚¬Â': '"',
    # Left double quote  
    'Ã¢â‚¬Å"': '"',
    # Em dash
    'Ã¢â‚¬â€œ': '—',
    # En dash
    'Ã¢â‚¬â€"': '–',
    # Ellipsis
    'Ã¢â‚¬Â¦': '…',
    # Bullet
    'Ã¢â‚¬Â¢': '•',
    # » character
    'Ã‚Â»': '»',
    'Â»': '»',
    # Registered trademark
    'Ã‚Â®': '®',
    # Trademark
    'Ã¢â€žÂ¢': '™',
}

def fix_file(filepath):
    """Fix encoding issues in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for bad, good in REPLACEMENTS.items():
            content = content.replace(bad, good)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    # Get all HTML files
    html_files = glob.glob('**/*.html', recursive=True)
    
    fixed_count = 0
    for filepath in html_files:
        if fix_file(filepath):
            print(f"Fixed: {filepath}")
            fixed_count += 1
    
    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == '__main__':
    main()
