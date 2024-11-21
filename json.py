import pandas as pd
import json
from itertools import combinations
from collections import Counter

csv_path = '/Users/mohithyadav/Desktop/Majorassgn3/data_scopus.csv'
data = pd.read_csv(csv_path)



def normalize_id(identifier):
    return identifier.strip().lower()

author_country_map = {}
author_affiliation_map = {}  
country_counts = Counter()

for idx, row in data.iterrows():
    if pd.notna(row['Authors']) and pd.notna(row['Authors with affiliations']):
        authors = row['Authors'].split(', ')
        affiliations = row['Authors with affiliations'].split('; ')

        for author, affiliation in zip(authors, affiliations):
            country = affiliation.split(',')[-1].strip() if ',' in affiliation else "Unknown"
            author_normalized = normalize_id(author)
            author_country_map[author_normalized] = country
            author_affiliation_map[author_normalized] = affiliation  # Save full affiliation
            country_counts[country] += 1


top_countries = set([country for country, _ in country_counts.most_common(10)])


nodes = [{
    "name": author,
    "country": country if country in top_countries else "Other",
    "affiliation": author_affiliation_map[author]
} for author, country in author_country_map.items()]
node_ids = {node["name"] for node in nodes}  


links = []
for authors in data['Authors'].dropna():
    author_list = [normalize_id(name) for name in authors.split(',')]
    author_pairs = list(combinations(author_list, 2))
    for source, target in author_pairs:
        if source in node_ids and target in node_ids:
            links.append({"source": source, "target": target})

output_data = {
    "nodes": nodes,
    "links": links
}


output_json_path = '/Users/mohithyadav/Desktop/MJ3/author_network_data_with_links.json'
with open(output_json_path, 'w') as f:
    json.dump(output_data, f, indent=4)

print(f"\nData saved with nodes and links: {output_json_path}")
