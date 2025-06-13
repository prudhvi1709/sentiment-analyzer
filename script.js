import {html, render} from 'https://unpkg.com/lit-html?module';

document.addEventListener('DOMContentLoaded', () => {
    // State & DOM shortcuts
    const $ = id => document.getElementById(id);
    const data = {results: [], file: [], charts: {}, ngramThreshold: 1, table: null}; // Ensure data.table can be nulled
    
    // Init event listeners
    $('upload-form').addEventListener('submit', e => processFile(e));
    $('load-sample-data').addEventListener('click', loadSampleData);
    ['download-csv', 'show-bigrams-btn', 'show-trigrams-btn', 'apply-keyword-btn', 'clear-keyword-btn', 'apply-threshold-btn'].forEach((id, i) => {
        $(id).addEventListener('click', () => [
            downloadCSV, 
            () => toggleNgramView('bigram'), 
            () => toggleNgramView('trigram'), 
            highlightKeywords, 
            () => {
                $('keyword-input').value = '';
                // The following line is now broken due to data.table removal for #results-table.
                // It will be fixed in a subsequent step.
                // if (data.table && data.results.length) {
                //     data.table.rows().every(function(idx) {
                //         this.cell(idx, 0).data(data.results[this.index()].text).draw('page');
                //     });
                // }
                // For now, to prevent errors, let's just clear highlights from data.results if any were stored there (they are not currently)
                // Or, if we re-render with lit-html, it will use the original text.
                // The actual fix is to re-render the lit-html table with new text.
                // For now, let's ensure the input is cleared and then trigger a re-render.
                updateDynamicResultsDisplay(); // Re-render to clear potential highlights if they were DOM based
            },
            applyNgramThreshold
        ][i]());
    });
    
    // Add theme change listener to update charts on theme change
    document.addEventListener('themeChanged', function(e) {
        const isDarkTheme = e.detail.theme === 'dark';
        
        // Update chart colors if they exist
        if (data.charts.sentiment) {
            const colors = {
                sentiment: {
                    light: ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E'],
                    dark: ['#66BB6A', '#FFD54F', '#EF5350', '#BDBDBD']
                },
                emotion: {
                    light: ['#FFEB3B', '#F44336', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#9E9E9E'],
                    dark: ['#FFF176', '#EF5350', '#42A5F5', '#AB47BC', '#FFA726', '#8D6E63', '#BDBDBD']
                }
            };
            
            data.charts.sentiment.data.datasets[0].backgroundColor = colors.sentiment[isDarkTheme ? 'dark' : 'light'];
            data.charts.sentiment.update();
            
            if (data.charts.emotion) {
                data.charts.emotion.data.datasets[0].backgroundColor = colors.emotion[isDarkTheme ? 'dark' : 'light'];
                data.charts.emotion.update();
            }
            
            if (data.charts.trend) {
                // Update trend chart colors
                const trendColors = {
                    positive: {
                        light: { border: 'rgba(75, 192, 192, 1)', background: 'rgba(75, 192, 192, 0.2)' },
                        dark: { border: 'rgba(102, 187, 106, 1)', background: 'rgba(102, 187, 106, 0.2)' }
                    },
                    negative: {
                        light: { border: 'rgba(255, 99, 132, 1)', background: 'rgba(255, 99, 132, 0.2)' },
                        dark: { border: 'rgba(239, 83, 80, 1)', background: 'rgba(239, 83, 80, 0.2)' }
                    },
                    neutral: {
                        light: { border: 'rgba(255, 206, 86, 1)', background: 'rgba(255, 206, 86, 0.2)' },
                        dark: { border: 'rgba(255, 213, 79, 1)', background: 'rgba(255, 213, 79, 0.2)' }
                    }
                };
                
                const theme = isDarkTheme ? 'dark' : 'light';
                data.charts.trend.data.datasets[0].borderColor = trendColors.positive[theme].border;
                data.charts.trend.data.datasets[0].backgroundColor = trendColors.positive[theme].background;
                data.charts.trend.data.datasets[1].borderColor = trendColors.negative[theme].border;
                data.charts.trend.data.datasets[1].backgroundColor = trendColors.negative[theme].background;
                data.charts.trend.data.datasets[2].borderColor = trendColors.neutral[theme].border;
                data.charts.trend.data.datasets[2].backgroundColor = trendColors.neutral[theme].background;
                data.charts.trend.update();
            }
        }
    });
    
    async function processFile(e) {
        e.preventDefault();
        // Reset UI
        ['results-section', 'ngram-results-section', 'trend-chart-section'].forEach(id => $(id).classList.add('d-none'));
        ['bigram-frequency-display', 'trigram-frequency-display'].forEach(id => $(id).innerHTML = '');
        $('keyword-input').value = '';
        Object.values(data.charts).forEach(chart => chart?.destroy());
        data.charts = {};
        
        const file = $('file-upload').files[0];
        if (!file || (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx'))) 
            return alert('Please upload a valid CSV/XLSX file');
        
        try {
            // Parse file & find columns
            data.file = await parseFile(file);
            if (!data.file.length) throw Error('No data found');
            
            const findCol = (userCol, commonCols) => {
                if (userCol && data.file[0][userCol]) return userCol;
                for (const col of commonCols) if (data.file[0][col]) return col;
                return Object.keys(data.file[0])[0];
            };
            
            const textCol = findCol($('text-column').value, ['text', 'message', 'content']);
            const dateCol = findCol($('date-column').value, ['date', 'timestamp']);
            if (!textCol) throw Error('Could not determine text column');
            
            // Process data
            await analyzeTexts(textCol);
            // renderResults(); // Replaced by incremental updates
            processNgrams();
            if (dateCol) createTrendChart(dateCol);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            $('progress-container').classList.add('d-none');
        }
    }
    
    async function parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    if (file.name.endsWith('.csv')) {
                        const lines = e.target.result.split('\n');
                        if (!lines.length) return reject(Error('Empty file'));
                        
                        const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
                        const rows = [];
                        
                        for (let i = 1; i < lines.length; i++) {
                            if (!lines[i].trim()) continue;
                            const values = parseCsvLine(lines[i]);
                            rows.push(Object.fromEntries(headers.map((h, idx) => [h, values[idx] || ''])));
                        }
                        resolve(rows);
                    } else {
                        resolve(XLSX.utils.sheet_to_json(XLSX.read(e.target.result, {type: 'binary'}).Sheets[XLSX.read(e.target.result, {type: 'binary'}).SheetNames[0]]));
                    }
                } catch (err) { reject(Error('Parse error: ' + err.message)); }
            };
            reader.onerror = () => reject(Error('Read error'));
            file.name.endsWith('.csv') ? reader.readAsText(file) : reader.readAsBinaryString(file);
        });
    }
    
    function parseCsvLine(line) {
        const vals = [];
        let inQuote = false, val = '';
        
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' && (i === 0 || line[i-1] !== '\\')) inQuote = !inQuote;
            else if (c === ',' && !inQuote) { vals.push(val.trim().replace(/^["']|["']$/g, '')); val = ''; }
            else val += c;
        }
        vals.push(val.trim().replace(/^["']|["']$/g, ''));
        return vals;
    }
    
const progressBarTemplate = (progress) => html`
    <h6 class="text-center">Processing texts...</h6>
    <div class="progress" style="height: 25px;">
        <div id="progress-bar" class="progress-bar progress-bar-striped progress-bar-animated"
             role="progressbar" style="width: ${progress}%"
             aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
    </div>
`;

    async function analyzeTexts(textCol) {
        data.results = []; // Ensure it's fresh for each analysis
        const texts = data.file.map((row, i) => ({id: i, text: row[textCol] || "", record: row}));
        const batchSize = 10;
        const progressContainer = document.getElementById('progress-container');
        
        $('progress-container').classList.remove('d-none');
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchTexts = batch.map(item => item.text.trim()).filter(text => text.length > 0);
            let results = [];
            
            try {
                if (batchTexts.length > 0) {
                    const response = await fetch('https://llmfoundry.straive.com/openai/v1/chat/completions', {
                        method: 'POST', credentials: 'include',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            model: "gpt-4.1-nano",
                            messages: [
                                {role: "system", content: "You are a sentiment analyzer. For each text input in the array, respond with JSON in the format: {\"result\": [{\"sentiment\": \"positive/negative/neutral\", \"emotion\": \"joy/anger/sadness/fear/surprise/disgust/neutral\"}]}"},
                                {role: "user", content: `Analyze these texts: ${JSON.stringify(batchTexts)}`}
                            ],
                            response_format: {type: "json_object"}
                        })
                    });
                    
                    if (response.ok) {
                        const content = (await response.json()).choices[0].message.content;
                        results = (typeof content === 'string' ? JSON.parse(content) : content).result || [];
                    }
                }
                
                let resultIndex = 0;
                batch.forEach(item => {
                    const hasTrimmedText = item.text.trim().length > 0;
                    const result = hasTrimmedText && resultIndex < results.length ? 
                        results[resultIndex++] : {sentiment: 'Unknown', emotion: 'Unknown'};
                    
                    data.results.push({
                        id: item.id, text: item.text, originalRecord: item.record,
                        sentiment: result.sentiment || 'Unknown', emotion: result.emotion || 'Unknown'
                    });
                });
            } catch (e) {
                batch.forEach(item => data.results.push({
                    id: item.id, text: item.text, originalRecord: item.record, 
                    sentiment: 'Error', emotion: 'Error'
                }));
            }
            
            // Update progress bar
            const progress = Math.min(100, Math.round(((i + batch.length) / texts.length) * 100));
            render(progressBarTemplate(progress), progressContainer);
            updateDynamicResultsDisplay(); // New call for incremental updates
        }
        
        $('progress-container').classList.add('d-none');
    }

const tableRowTemplate = (result) => html`
  <tr>
    <td>${result.text}</td>
    <td>${result.sentiment}</td>
    <td>${result.emotion}</td>
  </tr>
`;

const tableBodyContentTemplate = (results) => html`
  ${results.map(result => tableRowTemplate(result))}
`;
    
    function updateDynamicResultsDisplay() {
        if (data.results && data.results.length > 0) {
            $('results-section').classList.remove('d-none');
        } else {
            $('results-section').classList.add('d-none');
            return; // No data to display
        }
        
        // Process sentiment/emotion counts and capitalize first letter
        const counts = {sentiment: {}, emotion: {}};
        data.results.forEach(r => {
            const s = r.sentiment.charAt(0).toUpperCase() + r.sentiment.slice(1).toLowerCase();
            const e = r.emotion.charAt(0).toUpperCase() + r.emotion.slice(1).toLowerCase();
            counts.sentiment[s] = (counts.sentiment[s] || 0) + 1;
            counts.emotion[e] = (counts.emotion[e] || 0) + 1;
        });
        
        // lit-html table update
        const tbodyElement = document.querySelector('#results-table tbody');
        if (tbodyElement) {
            render(tableBodyContentTemplate(data.results), tbodyElement);
        }
        // DataTable for #results-table is no longer used. data.table might be null or for other tables if any.
        // Ensure data.table specific to #results-table is cleared if it was previously initialized.
        if(data.table && data.table.table().node().id === 'results-table'){
            // data.table.destroy(); // This would remove the table element itself if DataTable owned it.
            // We are just removing its control over the tbody content.
            // Since we are not re-initializing it for #results-table, this reference will just be stale for this specific table.
            // It's better to nullify it if we are sure it's the one for #results-table.
            // For now, the check `if (!data.table)` for initialization is removed, so it won't re-initialize.
        }
        
        // Define theme-compatible colors
        const getCurrentTheme = () => document.documentElement.getAttribute('data-bs-theme') || 'light';
        const isDarkTheme = getCurrentTheme() === 'dark';
        
        const colors = {
            sentiment: {
                light: ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E'],
                dark: ['#66BB6A', '#FFD54F', '#EF5350', '#BDBDBD']
            },
            emotion: {
                light: ['#FFEB3B', '#F44336', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#9E9E9E'],
                dark: ['#FFF176', '#EF5350', '#42A5F5', '#AB47BC', '#FFA726', '#8D6E63', '#BDBDBD']
            }
        };
        
        const currentThemeColors = {
            sentiment: colors.sentiment[isDarkTheme ? 'dark' : 'light'],
            emotion: colors.emotion[isDarkTheme ? 'dark' : 'light']
        };
        
        // Charts update
        if (!data.charts.sentiment) {
            data.charts.sentiment = new Chart($('sentiment-chart').getContext('2d'), {
                type: 'pie',
                data: {labels: Object.keys(counts.sentiment), datasets: [{data: Object.values(counts.sentiment), backgroundColor: currentThemeColors.sentiment}]},
                options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {position: 'right'}}}
            });
        } else {
            data.charts.sentiment.data.labels = Object.keys(counts.sentiment);
            data.charts.sentiment.data.datasets[0].data = Object.values(counts.sentiment);
            data.charts.sentiment.data.datasets[0].backgroundColor = currentThemeColors.sentiment; // Ensure colors update with theme
            data.charts.sentiment.update();
        }
        
        if (!data.charts.emotion) {
            data.charts.emotion = new Chart($('emotion-chart').getContext('2d'), {
                type: 'bar',
                data: {labels: Object.keys(counts.emotion), datasets: [{label: 'Emotion Count', data: Object.values(counts.emotion), backgroundColor: currentThemeColors.emotion}]},
                options: {responsive: true, maintainAspectRatio: false, plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}
            });
        } else {
            data.charts.emotion.data.labels = Object.keys(counts.emotion);
            data.charts.emotion.data.datasets[0].data = Object.values(counts.emotion);
            data.charts.emotion.data.datasets[0].backgroundColor = currentThemeColors.emotion; // Ensure colors update with theme
            data.charts.emotion.update();
        }
    }
    
    function processNgrams() {
        const stopWords = ["a", "an", "the", "is", "and", "or", "but", "to", "of", "in", "on", "at", "for"];
        const getNgrams = (n) => {
            const counts = {};
            data.results.forEach(r => {
                const words = r.text.toLowerCase().replace(/[.,?!;:"']/g, ' ').split(/\s+/)
                    .filter(w => w.length > 1 && !stopWords.includes(w));
                if (words.length < n) return;
                for (let i = 0; i <= words.length - n; i++) {
                    const gram = words.slice(i, i + n).join(' ');
                    counts[gram] = (counts[gram] || 0) + 1;
                }
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]);
        };
        
        // Store all ngrams
        data.allBigrams = getNgrams(2);
        data.allTrigrams = getNgrams(3);
        
        // Apply threshold to create filtered ngrams
        applyNgramThreshold();
    }
    
    function applyNgramThreshold() {
        const threshold = parseInt($('ngram-threshold').value) || 1;
        data.ngramThreshold = Math.max(1, threshold);
        
        // Filter ngrams by threshold
        data.bigrams = data.allBigrams ? data.allBigrams.filter(([_, count]) => count >= data.ngramThreshold) : [];
        data.trigrams = data.allTrigrams ? data.allTrigrams.filter(([_, count]) => count >= data.ngramThreshold) : [];
        
        // Update the current view
        const currentView = $('show-bigrams-btn').classList.contains('active') ? 'bigram' : 'trigram';
        toggleNgramView(currentView);
    }
    
    function createTrendChart(dateCol) {
        const byDate = {};
        data.results.forEach(r => {
            const date = new Date(r.originalRecord[dateCol]);
            if (isNaN(date)) return;
            const day = date.toISOString().split('T')[0];
            if (!byDate[day]) byDate[day] = {positive: 0, negative: 0, neutral: 0};
            const sentiment = r.sentiment.toLowerCase();
            if (['positive', 'negative', 'neutral'].includes(sentiment)) byDate[day][sentiment]++;
        });
        
        const dates = Object.keys(byDate).sort();
        if (dates.length) {
            // Define theme-aware colors
            const getCurrentTheme = () => document.documentElement.getAttribute('data-bs-theme') || 'light';
            const isDarkTheme = getCurrentTheme() === 'dark';
            
            const trendColors = {
                positive: {
                    light: { border: 'rgba(75, 192, 192, 1)', background: 'rgba(75, 192, 192, 0.2)' },
                    dark: { border: 'rgba(102, 187, 106, 1)', background: 'rgba(102, 187, 106, 0.2)' }
                },
                negative: {
                    light: { border: 'rgba(255, 99, 132, 1)', background: 'rgba(255, 99, 132, 0.2)' },
                    dark: { border: 'rgba(239, 83, 80, 1)', background: 'rgba(239, 83, 80, 0.2)' }
                },
                neutral: {
                    light: { border: 'rgba(255, 206, 86, 1)', background: 'rgba(255, 206, 86, 0.2)' },
                    dark: { border: 'rgba(255, 213, 79, 1)', background: 'rgba(255, 213, 79, 0.2)' }
                }
            };
            
            const theme = isDarkTheme ? 'dark' : 'light';
            
            data.charts.trend = new Chart($('sentiment-trend-chart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [
                        {label: 'Positive', data: dates.map(d => byDate[d].positive), 
                         borderColor: trendColors.positive[theme].border,
                         backgroundColor: trendColors.positive[theme].background, 
                         fill: false, tension: 0.1},
                        {label: 'Negative', data: dates.map(d => byDate[d].negative), 
                         borderColor: trendColors.negative[theme].border,
                         backgroundColor: trendColors.negative[theme].background, 
                         fill: false, tension: 0.1},
                        {label: 'Neutral', data: dates.map(d => byDate[d].neutral), 
                         borderColor: trendColors.neutral[theme].border,
                         backgroundColor: trendColors.neutral[theme].background, 
                         fill: false, tension: 0.1}
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {y: {beginAtZero: true}, x: {title: {display: true, text: 'Date'}}},
                    plugins: {legend: {position: 'top'}, tooltip: {mode: 'index', intersect: false}}
                }
            });
            $('trend-chart-section').classList.remove('d-none');
        }
    }
    
    function toggleNgramView(type) {
        const isBigram = type === 'bigram';
        $('bigram-frequency-display').classList.toggle('d-none', !isBigram);
        $('trigram-frequency-display').classList.toggle('d-none', isBigram);
        $('show-bigrams-btn').classList.toggle('active', isBigram);
        $('show-trigrams-btn').classList.toggle('active', !isBigram);
        $('ngram-results-section').classList.remove('d-none');
        
        // Render ngrams
        const container = $(isBigram ? 'bigram-frequency-display' : 'trigram-frequency-display');
        const ngrams = isBigram ? data.bigrams : data.trigrams;
        
        // Clear container
        container.innerHTML = '';
        
        if (!ngrams || !ngrams.length) {
            container.innerHTML = `<p class="text-muted">No ${type}s to display with frequency ≥ ${data.ngramThreshold}.</p>`;
            return;
        }
        
        const list = document.createElement('div');
        list.classList.add('list-group');
        
        ngrams.slice(0, 15).forEach(([gram, count]) => {
            const item = document.createElement('div');
            item.classList.add('list-group-item', 'd-flex', 'gap-3', 'align-items-center');
            
            const badge = document.createElement('span');
            badge.classList.add('badge', 'bg-primary', 'rounded-pill');
            badge.textContent = count;
            badge.style.minWidth = '3rem';
            badge.style.textAlign = 'center';
            
            const text = document.createElement('span');
            text.textContent = gram;
            text.classList.add('text-start');
            
            item.appendChild(badge);
            item.appendChild(text);
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    function downloadCSV() {
        if (!data.results.length) return;
        
        const headers = data.file.length ? Object.keys(data.file[0]) : [];
        const csv = [
            [...headers, 'Sentiment', 'Emotion'].join(','),
            ...data.results.map(row => {
                const vals = headers.map(h => {
                    let val = row.originalRecord[h] || '';
                    val = String(val).replace(/"/g, '""');
                    return val.includes(',') ? `"${val}"` : val;
                });
                return [...vals, row.sentiment, row.emotion].join(',');
            })
        ].join('\n');
        
        const link = document.createElement('a');
        link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        link.download = 'sentiment_analysis_results.csv';
        link.click();
    }
    
    function highlightKeywords() {
        // This function is now broken because data.table for #results-table is no longer used.
        // It needs to be rewritten to work with lit-html rendered table.
        // For now, it will likely cause an error or do nothing.
        // Acknowledged as per plan.
        console.warn("highlightKeywords is currently non-functional due to DataTable removal for #results-table.");
        if (!data.results.length) return;
        // const keywords = $('keyword-input').value.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        // if (!keywords.length) return $('clear-keyword-btn').click();
        
        // // Placeholder: a real implementation would re-render the lit-html table
        // // with new data that includes <mark> tags.
        // // This is complex because data.results would need to store highlighted versions
        // // or templates need to be more dynamic.
        // console.log("Keyword highlighting needs reimplementation for lit-html table.");
    }
    
    async function loadSampleData() {
        try {
            $('progress-container').classList.remove('d-none');
            
            // Fetch the sample CSV file
            const response = await fetch('sample_service_data.csv');
            if (!response.ok) throw new Error('Failed to load sample data');
            
            const blob = await response.blob();
            const file = new File([blob], 'sample_service_data.csv', { type: 'text/csv' });
            
            // Set the file in the file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            $('file-upload').files = dataTransfer.files;
            
            // Submit the form automatically
            $('upload-form').dispatchEvent(new Event('submit'));
        } catch (err) {
            alert('Error loading sample data: ' + err.message);
            $('progress-container').classList.add('d-none');
        }
    }
});
