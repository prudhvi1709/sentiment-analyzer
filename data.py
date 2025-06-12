# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "faker",
# ]
# ///
import csv
import random
from faker import Faker
from datetime import datetime, timedelta

fake = Faker()

# Define sentiment and emotion templates
templates = {
    "positive": [
        "The support team was {} and {}.",
        "I had a {} experience with customer service.",
        "Everything worked {} and I'm very {} with the service.",
        "Your team responded {} to my query and provided {} solutions.",
        "The product exceeded my expectations, it was both {} and {}.",
    ],
    "negative": [
        "I faced {} issues and got no {} response.",
        "The experience was extremely {} and {}.",
        "I am {} with the support and the delay was {}.",
        "Your system is {} and the interface is {}.",
        "The customer service representative was {} and seemed {} about my issue.",
    ],
    "neutral": [
        "The service was {} and {}.",
        "Nothing to {}. It was an {} experience.",
        "Everything seems {} so far.",
        "The product works as {}, with {} functionality.",
        "I received a {} response within a {} timeframe.",
    ]
}

# Map sentiments to emotions
emotions_map = {
    "positive": ["joy", "surprise"],
    "negative": ["anger", "disgust", "sadness", "fear"],
    "neutral": ["neutral"]
}

# Expanded word pools
positive_words = ["quick", "helpful", "pleasant", "excellent", "smooth", "happy", "efficient", 
                 "responsive", "impressive", "delightful", "outstanding", "exceptional", "satisfying"]
negative_words = ["frustrating", "delayed", "unhelpful", "terrible", "disappointing", "annoying", 
                 "unresponsive", "confusing", "inadequate", "unreliable", "disastrous", "poor", "unacceptable"]
neutral_words = ["standard", "okay", "normal", "expected", "typical", "average", "adequate", 
                "reasonable", "sufficient", "functional", "basic", "regular", "conventional"]

# Expanded categories
categories = ["support", "complaint", "feedback", "bug", "billing", "onboarding", 
              "feature request", "technical issue", "account management", "product question",
              "service outage", "general inquiry", "installation help"]

# Generate data with more variation
rows = []
for _ in range(500):  # Increase to 500 entries for more comprehensive data
    sentiment = random.choice(list(templates.keys()))
    template = random.choice(templates[sentiment])
    
    # Assign appropriate words based on sentiment
    if sentiment == "positive":
        words = random.sample(positive_words, min(2, len(positive_words)))
    elif sentiment == "negative":
        words = random.sample(negative_words, min(2, len(negative_words)))
    else:
        words = random.sample(neutral_words, min(2, len(neutral_words)))
    
    # Generate text
    text = template.format(*words)
    
    # Generate dates with more variation across a year
    date_range = random.choice([
        ("-1y", "-9m"),  # 9-12 months ago
        ("-9m", "-6m"),  # 6-9 months ago
        ("-6m", "-3m"),  # 3-6 months ago
        ("-3m", "-1m"),  # 1-3 months ago
        ("-1m", "today") # Within the last month
    ])
    date = fake.date_between(start_date=date_range[0], end_date=date_range[1]).strftime("%Y-%m-%d")
    
    # Select category
    category = random.choice(categories)
    
    # Assign emotion based on sentiment
    emotion = random.choice(emotions_map[sentiment])
    
    # Add row with emotion included
    rows.append([text, date, category, sentiment, emotion])

# Write to CSV
with open("sample_service_data.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "date", "category", "sentiment", "emotion"])
    writer.writerows(rows)

print(f"✅ sample_service_data.csv created with {len(rows)} diverse test cases.")
