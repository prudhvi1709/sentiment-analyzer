document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const uploadForm = document.getElementById('upload-form');
    const fileUpload = document.getElementById('file-upload');
    const textColumnInput = document.getElementById('text-column');
    const resultsSection = document.getElementById('results-section');
    const loadingSpinner = document.getElementById('loading-spinner');
    const downloadCsvBtn = document.getElementById('download-csv');
    const ngramResultsSection = document.getElementById('ngram-results-section');
    const showBigramsBtn = document.getElementById('show-bigrams-btn');
    const showTrigramsBtn = document.getElementById('show-trigrams-btn');
    const bigramFrequencyDisplay = document.getElementById('bigram-frequency-display');
    const trigramFrequencyDisplay = document.getElementById('trigram-frequency-display');
    const keywordInput = document.getElementById('keyword-input');
    const applyKeywordBtn = document.getElementById('apply-keyword-btn');
    const clearKeywordBtn = document.getElementById('clear-keyword-btn');
    const dateColumnInput = document.getElementById('date-column');
    const trendChartSection = document.getElementById('trend-chart-section');
    const sentimentTrendChartCanvas = document.getElementById('sentiment-trend-chart').getContext('2d');
    
    // State variables
    let dataTable, sentimentChart, emotionChart, analysisResults = [], originalFileContents = [];
    let topBigrams = [], topTrigrams = [];
    let sentimentTrendChart;
    
    // Handle form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileUpload.files[0];

        // Clear/hide previous results sections
        resultsSection.classList.add('d-none');
        ngramResultsSection.classList.add('d-none');
        bigramFrequencyDisplay.innerHTML = '';
        trigramFrequencyDisplay.innerHTML = '';
        trendChartSection.classList.add('d-none');
        if (sentimentTrendChart) {
            sentimentTrendChart.destroy();
            sentimentTrendChart = null;
        }
        keywordInput.value = ''; // Clear keyword input

        
        if (!file || (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx'))) {
            alert('Error: Please upload a valid .csv or .xlsx file.');
            return;
        }
        
        try {
            loadingSpinner.style.display = 'flex';

            originalFileContents = await parseFile(file);
            if (originalFileContents.length === 0) throw new Error('No data found in file.');

            const textColumn = getTextColumn(originalFileContents);
            if (!textColumn) throw new Error('Could not determine text column. Please specify.');
            
            const actualDateColumn = getIdentifiedDateColumn(Object.keys(originalFileContents[0] || {}), dateColumnInput.value.trim());

            const textsToAnalyze = originalFileContents.map((row, index) => ({
                id: index,
                text: row[textColumn] || "", // Ensure text is not null/undefined
                originalRecord: row
            }));
            
            if (textsToAnalyze.filter(t => t.text.trim() !== '').length === 0) throw new Error('No valid text data found in the specified text column.');
            
            analysisResults = await analyzeSentiment(textsToAnalyze);
            displayResults(analysisResults); // This will show resultsSection

            // N-gram analysis
            const allTexts = analysisResults.map(r => r.text);
            topBigrams = generateNgrams(allTexts, 2);
            topTrigrams = generateNgrams(allTexts, 3);

            displayNgrams(topBigrams, bigramFrequencyDisplay, "Bigrams");
            trigramFrequencyDisplay.classList.add('d-none'); // Default to bigrams
            bigramFrequencyDisplay.classList.remove('d-none');
            showBigramsBtn.classList.add('active');
            showTrigramsBtn.classList.remove('active');
            ngramResultsSection.classList.remove('d-none');

            // Trend chart
            if (actualDateColumn) {
                generateTrendChart(analysisResults, actualDateColumn);
            }

        } catch (error) {
            alert('Error: ' + error.message);
            // Ensure all sections are hidden on error
            resultsSection.classList.add('d-none');
            ngramResultsSection.classList.add('d-none');
            trendChartSection.classList.add('d-none');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });
    
    // Parse uploaded file
    async function parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    let parsedData = [];
                    
                    if (file.name.endsWith('.csv')) {
                        const lines = data.split('\n');
                        if (lines.length === 0) return reject(new Error('Empty CSV file.'));
                        
                        const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
                        
                        for (let i = 1; i < lines.length; i++) {
                            if (lines[i].trim() === '') continue;
                            
                            // Handle quoted text with commas
                            const values = [];
                            let inQuote = false, currentValue = '';
                            
                            for (let j = 0; j < lines[i].length; j++) {
                                const char = lines[i][j];
                                if (char === '"' && (j === 0 || lines[i][j-1] !== '\\')) {
                                    inQuote = !inQuote;
                                } else if (char === ',' && !inQuote) {
                                    values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
                                    currentValue = '';
                                } else {
                                    currentValue += char;
                                }
                            }
                            values.push(currentValue.trim().replace(/^["']|["']$/g, ''));
                            
                            const row = {};
                            headers.forEach((header, index) => row[header] = values[index] || '');
                            parsedData.push(row);
                        }
                    } else {
                        const workbook = XLSX.read(data, { type: 'binary' });
                        parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    }
                    
                    resolve(parsedData);
                } catch (error) {
                    reject(new Error('Error parsing file: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Error reading file.'));
            file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsBinaryString(file);
        });
    }
    
    // Determine text column from data
    function getTextColumn(data) {
        if (data.length === 0) return null;
        
        const userColumn = textColumnInput.value.trim();
        if (userColumn && data[0].hasOwnProperty(userColumn)) return userColumn;
        
        const possibleColumns = ['text', 'message', 'content', 'description', 'comment', 'feedback'];
        for (const column of possibleColumns) {
            if (data[0].hasOwnProperty(column)) return column;
        }
        
        return Object.keys(data[0])[0];
    }
    
    // Determine Date column from data headers and user input
    function getIdentifiedDateColumn(dataHeaders, userInput) {
        if (userInput && dataHeaders.includes(userInput)) {
            return userInput;
        }
        const commonDateColumns = ['date', 'timestamp', 'created_at', 'created', 'time', 'event_date', 'transaction_date'];
        for (const col of commonDateColumns) {
            const foundHeader = dataHeaders.find(header => header.toLowerCase() === col.toLowerCase());
            if (foundHeader) return foundHeader;
        }
        return null;
    }

    // Process sentiment analysis 
    async function analyzeSentiment(textsToAnalyze) {
        const batchSize = 10;
        const results = [];
        
        for (let i = 0; i < textsToAnalyze.length; i += batchSize) {
            const batch = textsToAnalyze.slice(i, i + batchSize);
            const batchPromises = batch.map(async item => {
                try {
                    // Only send text to API if it's not empty
                    const apiResult = item.text.trim() === '' ? { sentiment: 'Unknown', emotion: 'Unknown' } : await callAPI(item.text);
                    return {
                        id: item.id,
                        text: item.text,
                        originalRecord: item.originalRecord,
                        sentiment: apiResult.sentiment || 'Unknown',
                        emotion: apiResult.emotion || 'Unknown'
                    };
                } catch (error) {
                    console.error('Error analyzing text:', item.text, error);
                    return {
                        id: item.id,
                        text: item.text,
                        originalRecord: item.originalRecord,
                        sentiment: 'Error',
                        emotion: 'Error'
                    };
                }
            });
            results.push(...await Promise.all(batchPromises));
        }
        return results;
    }
    
    // Call sentiment analysis API
    async function callAPI(text) {
        const response = await fetch('https://llmfoundry.straive.com/openai/v1/chat/completions', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a sentiment analyzer. Respond only with JSON: {\"sentiment\": \"positive/negative/neutral\", \"emotion\": \"joy/anger/sadness/fear/surprise/disgust/neutral\"}" },
                    { role: "user", content: `Analyze: "${text}"` }
                ]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        try {
            return JSON.parse(data.choices[0].message.content);
        } catch (e) {
            return { sentiment: 'Unknown', emotion: 'Unknown' };
        }
    }
    
    // Display results in UI
    function displayResults(resultsData) {
        resultsSection.classList.remove('d-none');
        
        if (dataTable) {
            dataTable.destroy();
            // Also clear keyword input as table is being reset
            keywordInput.value = '';
        }

        // Ensure table is populated with plain text, not HTML-marked up text
        const tableData = resultsData.map(r => ({
            text: r.text, // Original text for display
            sentiment: r.sentiment,
            emotion: r.emotion
            // originalRecord is part of analysisResults, but not directly bound to table columns here
        }));

        dataTable = new DataTable('#results-table', {
            data: tableData,
            columns: [
                { data: 'text' },
                { data: 'sentiment' },
                { data: 'emotion' }
            ],
            responsive: true,
            order: [[1, 'asc']]
        });
        
        createCharts(resultsData);
    }
    
    // Create charts for sentiment and emotion distribution
    function createCharts(resultsData) {
        const counts = { sentiment: {}, emotion: {} };
        
        resultsData.forEach(result => {
            const sentiment = result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1).toLowerCase();
            const emotion = result.emotion.charAt(0).toUpperCase() + result.emotion.slice(1).toLowerCase();
            
            counts.sentiment[sentiment] = (counts.sentiment[sentiment] || 0) + 1;
            counts.emotion[emotion] = (counts.emotion[emotion] || 0) + 1;
        });
        
        if (sentimentChart) sentimentChart.destroy();
        if (emotionChart) emotionChart.destroy();
        
        const colors = {
            sentiment: ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E'],
            emotion: ['#FFEB3B', '#F44336', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#9E9E9E', '#607D8B']
        };
        
        sentimentChart = new Chart(document.getElementById('sentiment-chart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(counts.sentiment),
                datasets: [{
                    data: Object.values(counts.sentiment),
                    backgroundColor: colors.sentiment
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
        
        emotionChart = new Chart(document.getElementById('emotion-chart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(counts.emotion),
                datasets: [{
                    label: 'Emotion Count',
                    data: Object.values(counts.emotion),
                    backgroundColor: colors.emotion
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    // Generate N-grams and count frequencies
    function generateNgrams(texts, n) {
        const ngramCounts = {};
        const stopWords = ["a", "an", "the", "is", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with", "by", "from", "about", "as", "into", "like", "through", "after", "over", "between", "out", "against", "during", "without", "before", "under", "around", "among"]; // Basic stop words

        texts.forEach(text => {
            // Convert to lowercase and remove punctuation (replace with space)
            const cleanedText = text.toLowerCase().replace(/[.,?!;:"']/g, ' ');
            const words = cleanedText.split(/\s+/).filter(word => word.length > 1 && !stopWords.includes(word)); // Filter short and stop words

            if (words.length < n) return;

            for (let i = 0; i <= words.length - n; i++) {
                const ngram = words.slice(i, i + n).join(' ');
                ngramCounts[ngram] = (ngramCounts[ngram] || 0) + 1;
            }
        });

        // Convert to array and sort by frequency
        return Object.entries(ngramCounts).sort((a, b) => b[1] - a[1]);
    }

    // Display N-grams in the UI
    function displayNgrams(ngramData, displayElement, typeName) {
        displayElement.innerHTML = ''; // Clear previous content

        if (!ngramData || ngramData.length === 0) {
            displayElement.innerHTML = `<p class="text-muted">No ${typeName.toLowerCase()} to display.</p>`;
            return;
        }

        const topN = ngramData.slice(0, 15); // Display top 15 N-grams

        const ol = document.createElement('ol');
        ol.classList.add('list-group', 'list-group-numbered');

        topN.forEach(([ngram, count]) => {
            const li = document.createElement('li');
            li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
            li.textContent = ngram;

            const badge = document.createElement('span');
            badge.classList.add('badge', 'bg-primary', 'rounded-pill');
            badge.textContent = count;
            li.appendChild(badge);

            ol.appendChild(li);
        });

        displayElement.appendChild(ol);
    }

    // Generate Sentiment Trend Chart
    function generateTrendChart(trendAnalysisResults, dateColumnName) {
        if (sentimentTrendChart) {
            sentimentTrendChart.destroy();
            sentimentTrendChart = null;
        }
        trendChartSection.classList.add('d-none'); // Hide until data is ready

        if (!dateColumnName || trendAnalysisResults.length === 0) {
            console.warn("Date column not specified or no analysis results for trend chart.");
            return;
        }

        const trendData = [];
        trendAnalysisResults.forEach(result => {
            const dateValue = result.originalRecord[dateColumnName];
            const sentiment = result.sentiment; // Already in lowercase from API or 'Unknown'/'Error'

            if (dateValue) {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
                    trendData.push({ day, sentiment });
                } else {
                    console.warn(`Invalid date value encountered: ${dateValue}`);
                }
            }
        });

        if (trendData.length === 0) {
            console.warn("No valid date entries found for trend chart.");
            return; // No data to plot
        }

        const dailyCounts = trendData.reduce((acc, { day, sentiment }) => {
            if (!acc[day]) {
                acc[day] = { positive: 0, negative: 0, neutral: 0, unknown: 0, error: 0 };
            }
            const sentimentKey = sentiment.toLowerCase(); // Ensure consistent key usage
            if (acc[day].hasOwnProperty(sentimentKey)) {
                 acc[day][sentimentKey]++;
            } else {
                // This case should ideally not happen if sentiment values are controlled
                console.warn(`Unexpected sentiment value: ${sentiment}`);
                acc[day].unknown++; // Or handle as a generic 'other' category
            }
            return acc;
        }, {});

        const labels = Object.keys(dailyCounts).sort((a,b) => new Date(a) - new Date(b)); // Sort dates chronologically

        if (labels.length === 0) {
             console.warn("No data labels generated for trend chart after processing.");
            return;
        }

        const positiveData = labels.map(day => dailyCounts[day].positive || 0);
        const negativeData = labels.map(day => dailyCounts[day].negative || 0);
        const neutralData = labels.map(day => dailyCounts[day].neutral || 0);

        sentimentTrendChart = new Chart(sentimentTrendChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Positive',
                        data: positiveData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Negative',
                        data: negativeData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Neutral',
                        data: neutralData,
                        borderColor: 'rgba(255, 206, 86, 1)',
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Sentiments' }
                    },
                    x: {
                         title: { display: true, text: 'Date' }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });
        trendChartSection.classList.remove('d-none'); // Show the chart section
    }


    // Handle CSV download
    downloadCsvBtn.addEventListener('click', () => {
        if (analysisResults.length === 0) return;
        
        // Use analysisResults which contains originalRecord to include all original columns plus analysis columns
        const headers = originalFileContents.length > 0 ? Object.keys(originalFileContents[0]) : [];
        const csvHeaders = [...headers, 'Sentiment', 'Emotion'].join(',');

        const csvRows = analysisResults.map(row => {
            const originalDataValues = headers.map(header => {
                let value = row.originalRecord[header] || '';
                // Escape double quotes and handle commas within values
                value = String(value).replace(/"/g, '""');
                if (String(value).includes(',')) {
                    value = `"${value}"`;
                }
                return value;
            });
            return [...originalDataValues, row.sentiment, row.emotion].join(',');
        });
        
        const csvContent = 'data:text/csv;charset=utf-8,' + csvHeaders + '\n' + csvRows.join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'sentiment_analysis_results.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Event listener for "Show Bigrams" button
    showBigramsBtn.addEventListener('click', () => {
        if (!showBigramsBtn.classList.contains('active')) {
            bigramFrequencyDisplay.classList.remove('d-none');
            trigramFrequencyDisplay.classList.add('d-none');

            showBigramsBtn.classList.add('active');
            showTrigramsBtn.classList.remove('active');

            // Re-display bigrams, which also handles empty state
            displayNgrams(topBigrams, bigramFrequencyDisplay, "Bigrams");
        }
    });

    // Event listener for "Show Trigrams" button
    showTrigramsBtn.addEventListener('click', () => {
        if (!showTrigramsBtn.classList.contains('active')) {
            trigramFrequencyDisplay.classList.remove('d-none');
            bigramFrequencyDisplay.classList.add('d-none');

            showTrigramsBtn.classList.add('active');
            showBigramsBtn.classList.remove('active');

            // Re-display trigrams, which also handles empty state
            displayNgrams(topTrigrams, trigramFrequencyDisplay, "Trigrams");
        }
    });

    // Event listener for "Apply Keywords" button
    applyKeywordBtn.addEventListener('click', () => {
        if (!dataTable || analysisResults.length === 0) return;

        const keywords = keywordInput.value.toLowerCase().split(',').map(k => k.trim()).filter(k => k !== '');

        if (keywords.length === 0) {
            // If no keywords, effectively clear existing highlights by restoring original text
            clearKeywordBtn.click(); // Programmatically click the clear button
            return;
        }

        dataTable.rows().every(function (rowIndex) {
            const originalText = analysisResults[this.index()].text; // Get original text
            let newTextHtml = originalText;
            let hasHighlight = false;

            keywords.forEach(keyword => {
                // Escape regex special characters in keyword
                const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(escapedKeyword, 'gi');

                if (regex.test(originalText)) { // Test on original text
                    hasHighlight = true;
                    // Replace on newTextHtml to accumulate highlights if keywords overlap or multiple keywords exist
                    newTextHtml = newTextHtml.replace(regex, (match) => `<mark class="bg-warning">${match}</mark>`);
                }
            });

            // Update cell data. DataTables will handle drawing.
            // Ensure to update with original text if no keywords were found for this row but it might have been highlighted previously
            this.cell(rowIndex, 0).data(newTextHtml).draw('page');
        });
    });

    // Event listener for "Clear Keywords" button
    clearKeywordBtn.addEventListener('click', () => {
        keywordInput.value = '';
        if (dataTable && analysisResults.length > 0) {
            dataTable.rows().every(function (rowIndex) {
                // Restore original text from analysisResults
                this.cell(rowIndex, 0).data(analysisResults[this.index()].text).draw('page');
            });
        }
    });
});
