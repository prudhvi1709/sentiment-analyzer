# Service Sentiment Analyzer

A single-page web application for analyzing sentiment and emotion in service-related text data such as support tickets, customer chats, or feedback.

## Features

- Upload CSV or XLSX files containing text data
- Automatic text column detection (or manual specification)
- Sentiment analysis (positive, negative, neutral)
- Emotion analysis (joy, anger, sadness, fear, surprise, disgust, neutral)
- Interactive data visualization with charts
- Sortable results table
- Export results as CSV

## How to Use

1. Open `index.html` in a modern web browser
2. Click "Choose File" to select a CSV or XLSX file containing text data
3. Optionally, specify the column name that contains text if automatic detection fails
4. Click "Analyze Sentiment" to process the data
5. View the results in charts and table format
6. Use the table's sorting and filtering capabilities to explore the data
7. Click "Download Results as CSV" to save the analysis results

## File Format Requirements

- File must be in CSV or XLSX format
- File must contain at least one column with text data
- CSV files should use comma (,) as the delimiter
- First row should contain column headers

## Sample CSV Format

```
text,date,category
"The customer service was excellent and very helpful!",2023-06-15,support
"I'm having issues with the product and need help urgently.",2023-06-16,complaint
"The system works as expected, no problems so far.",2023-06-17,feedback
```

## Technical Details

This application uses:

- HTML5, CSS3, and JavaScript
- Bootstrap 5 for UI components
- SheetJS for Excel file parsing
- Chart.js for data visualization
- DataTables.js for interactive tables
- LLM Foundry API for sentiment and emotion analysis

## Notes

- All processing happens in the browser
- Data is not stored on any server
- Internet connection is required for the sentiment analysis API

## Troubleshooting

If you encounter issues:
- Ensure your file format meets the requirements
- Check that the text column name is correctly specified if automatic detection fails
- Verify your internet connection is active for API access 