import sys
import yaml
from bs4 import BeautifulSoup

def update_html_from_yaml(html_file, yaml_file):
    # Read the YAML file
    with open(yaml_file, 'r') as y_file:
        yaml_data = yaml.safe_load(y_file)

    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as h_file:
        soup = BeautifulSoup(h_file, 'html.parser')

    # Update the HTML content based on the YAML data
    for key, value in yaml_data.items():
        print("Search: %s = %s" % (key, value))
        # Find all elements with data-copy-id attribute equal to the key
        elements = soup.find_all(attrs={"data-copy-id": key})

        if elements:
            for element in elements:
                print("\tFound: data-copy-id=%s" % key)
                element.string = str(value)
        else:
            print("\tNo element found with data-copy-id='%s'" % key)

    # Write the updated HTML back to the file
    with open(html_file, 'w', encoding='utf-8') as h_file:
        h_file.write(str(soup))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <path_to_html_file> <path_to_yaml_file>")
        sys.exit(1)

    html_file_path = sys.argv[1]
    yaml_file_path = sys.argv[2]

    update_html_from_yaml(html_file_path, yaml_file_path)
