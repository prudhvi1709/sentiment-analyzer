document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const uploadForm = document.getElementById('upload-form');
    const fileUpload = document.getElementById('file-upload');
    const textColumnInput = document.getElementById('text-column');
    const resultsSection = document.getElementById('results-section');
    const loadingSpinner = document.getElementById('loading-spinner');
    const downloadCsvBtn = document.getElementById('download-csv');
    
    // State variables
    let dataTable, sentimentChart, emotionChart, analysisResults = [];
    
    // Handle form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileUpload.files[0];
        
        if (!file || (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx'))) {
            alert('Error: Please upload a valid .csv or .xlsx file.');
            return;
        }
        
        try {
            loadingSpinner.style.display = 'flex';
            const data = await parseFile(file);
            const textColumn = getTextColumn(data);
            
            if (!textColumn) throw new Error('Could not determine text column.');
            
            const textData = data.map(row => row[textColumn]).filter(text => text && text.trim() !== '');
            if (textData.length === 0) throw new Error('No valid text data found.');
            
            analysisResults = await analyzeSentiment(textData);
            displayResults(analysisResults);
        } catch (error) {
            alert('Error: ' + error.message);
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
    
    // Process sentiment analysis 
    async function analyzeSentiment(textData) {
        const batchSize = 10;
        const results = [];
        
        for (let i = 0; i < textData.length; i += batchSize) {
            const batch = textData.slice(i, i + batchSize);
            const batchPromises = batch.map(async text => {
                try {
                    const result = await callAPI(text);
                    return { text, sentiment: result.sentiment || 'Unknown', emotion: result.emotion || 'Unknown' };
                } catch (error) {
                    console.error('Error analyzing text:', error);
                    return { text, sentiment: 'Error', emotion: 'Error' };
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
    function displayResults(results) {
        resultsSection.classList.remove('d-none');
        
        if (dataTable) dataTable.destroy();
        dataTable = new DataTable('#results-table', {
            data: results,
            columns: [
                { data: 'text' },
                { data: 'sentiment' },
                { data: 'emotion' }
            ],
            responsive: true,
            order: [[1, 'asc']]
        });
        
        createCharts(results);
    }
    
    // Create charts for sentiment and emotion distribution
    function createCharts(results) {
        const counts = { sentiment: {}, emotion: {} };
        
        results.forEach(result => {
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
    
    // Handle CSV download
    downloadCsvBtn.addEventListener('click', () => {
        if (analysisResults.length === 0) return;
        
        const csvContent = 'data:text/csv;charset=utf-8,' + 
            'Text,Sentiment,Emotion\n' + 
            analysisResults.map(row => 
                `"${row.text.replace(/"/g, '""')}",${row.sentiment},${row.emotion}`
            ).join('\n');
        
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'sentiment_analysis_results.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
