#!/usr/bin/env python3
import os
import re
from deep_translator import GoogleTranslator

WRITEUPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), '_writeups')

def extract_frontmatter(content):
    match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if match:
        return match.group(1), match.group(2)
    return "", content

def protect_elements(text):
    protected = []
    # Protect codeblocks
    codeblocks = re.findall(r'```.*?```', text, re.DOTALL)
    for i, block in enumerate(codeblocks):
        marker = f"__CODEBLOCK_{i}__"
        text = text.replace(block, marker)
        protected.append((marker, block))
        
    # Protect images
    images = re.findall(r'!\[.*?\]\(.*?\)', text)
    for i, img in enumerate(images):
        marker = f"__IMAGE_{i}__"
        text = text.replace(img, marker)
        protected.append((marker, img))
        
    # Protect inline code
    inline = re.findall(r'`[^`]+`', text)
    for i, inl in enumerate(inline):
        marker = f"__INLINE_{i}__"
        text = text.replace(inl, marker)
        protected.append((marker, inl))

    return text, protected

def restore_elements(text, protected):
    for marker, original in protected:
        text = text.replace(marker, original)
    return text

def translate_markdown(content, source="es", target="en"):
    print(f"Translating {len(content)} characters from {source} to {target}...")
    
    text, protected = protect_elements(content)
    
    translator = GoogleTranslator(source=source, target=target)
    
    # Split by paragraphs to avoid API limits (5000 chars)
    paragraphs = text.split('\n\n')
    translated_paragraphs = []
    
    for p in paragraphs:
        if p.strip() == "":
            translated_paragraphs.append(p)
            continue
            
        # Don't translate if it's just a marker or non-alphabetic
        if re.match(r'^__.*__$', p.strip()) or not re.search(r'[a-zA-Z]', p):
            translated_paragraphs.append(p)
            continue
            
        try:
            translated = translator.translate(p)
            translated_paragraphs.append(translated)
        except Exception as e:
            print(f"Error translating chunk: {e}")
            translated_paragraphs.append(p)

    translated_text = '\n\n'.join(translated_paragraphs)
    final_text = restore_elements(translated_text, protected)
    return final_text

def process_writeups():
    for filename in os.listdir(WRITEUPS_DIR):
        if not filename.endswith('.md'):
            continue
            
        # Ignore files that are already English versions
        if filename.endswith('_en.md'):
            continue
            
        base_name = filename.replace('.md', '')
        es_path = os.path.join(WRITEUPS_DIR, filename)
        en_path = os.path.join(WRITEUPS_DIR, f"{base_name}_en.md")
        
        # If english counterpart doesn't exist, generate it
        if not os.path.exists(en_path):
            print(f"Found new Spanish writeup: {filename}")
            
            with open(es_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            frontmatter, body = extract_frontmatter(content)
            
            # Ensure the spanish file has lang tagging for the frontend filter
            if "lang: es" not in frontmatter:
                new_frontmatter = frontmatter + "\nlang: es"
                with open(es_path, 'w', encoding='utf-8') as f:
                    f.write(f"---\n{new_frontmatter}\n---\n{body}")
                    
            print(f"Translating to English -> {en_path}")
            translated_body = translate_markdown(body, "es", "en")
            
            en_frontmatter = frontmatter.replace("lang: es", "")
            en_frontmatter += "\nlang: en"
            
            with open(en_path, 'w', encoding='utf-8') as f:
                f.write(f"---\n{en_frontmatter}\n---\n{translated_body}")
                
            print("Translation complete.\n")

if __name__ == "__main__":
    process_writeups()
