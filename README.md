# Service Sentiment Analyzer

A single-page web application for analyzing sentiment and emotion in service-related text data such as support tickets, customer chats, or feedback.

## Features

- Upload CSV or XLSX files containing text data
- Automatic text column detection (or manual specification)
- Date column selection for time-based trend analysis
- Sentiment analysis (positive, negative, neutral)
- Emotion analysis (joy, anger, sadness, fear, surprise, disgust, neutral)
- Interactive data visualization with charts (sentiment distribution, emotion distribution)
- Sentiment trend analysis over time (when date column is available)
- N-gram analysis (bigrams and trigrams) with adjustable frequency threshold
- Keyword highlighting in results
- Dark/light theme support with automatic chart color adaptation
- Sortable and filterable results table
- Export results as CSV
- Sample data loading option for quick demonstration

## How to Use

1. Open `index.html` in a modern web browser
2. Click "Choose File" to select a CSV or XLSX file containing text data
3. Optionally, specify the column name that contains text if automatic detection fails
4. Optionally, specify a date column for trend analysis
5. Click "Analyze Sentiment" to process the data
6. View the results in charts and table format
7. Explore n-gram frequencies to identify common phrases
8. Use the keyword highlighting feature to find specific terms
9. Toggle between light and dark themes using the theme selector
10. Use the table's sorting and filtering capabilities to explore the data
11. Click "Download Results as CSV" to save the analysis results

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

- HTML5, CSS3, and JavaScript (vanilla JS with modular organization)
- Bootstrap 5.3.3 for responsive UI components and styling
- Bootstrap Icons 1.11.3 for icon elements
- Dark theme toggle implementation with theme persistence
- SheetJS (XLSX 0.18.5) for Excel file parsing
- Chart.js for data visualization (pie, bar, and line charts)
- DataTables.js 1.13.6 for interactive, sortable tables
- jQuery 3.6.0 (used by DataTables)
- LLM Foundry API with GPT-4.1-nano model for sentiment and emotion analysis
- CSV parsing with custom handling for quoted text

## Data Processing Features

- Batch processing of texts to optimize API calls
- Progress bar for visual feedback during processing
- N-gram extraction with stopword filtering
- Customizable n-gram frequency threshold
- Sentiment trend analysis with time-series visualization
- Keyword highlighting with regular expression support
- Automatic chart color adaptation based on current theme

## Notes

- All processing happens in the browser
- Data is not stored on any server
- Internet connection is required for the sentiment analysis API
- The application uses the LLM Foundry API from Straive for sentiment analysis
- API requests include credentials with each request

## Troubleshooting

If you encounter issues:
- Ensure your file format meets the requirements
- Check that the text column name is correctly specified if automatic detection fails
- Verify your internet connection is active for API access
- Try the "Load Sample Data" option to test if the application works with known-good data
- Check the browser console for any JavaScript errors

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 