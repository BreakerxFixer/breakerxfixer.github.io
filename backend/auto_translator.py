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
            
        # Avoid processing files that are already translations of others to prevent infinite loops
        if filename.endswith('_en.md') or filename.endswith('_es.md'):
            continue
            
        path = os.path.join(WRITEUPS_DIR, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        frontmatter, body = extract_frontmatter(content)
        
        # Determine source language from frontmatter
        source_lang = "es" # default
        if "lang: en" in frontmatter:
            source_lang = "en"
        elif "lang: es" in frontmatter:
            source_lang = "es"
        else:
            # If no lang tag, add default 'es'
            frontmatter += "\nlang: es"
            with open(path, 'w', encoding='utf-8') as f:
                f.write(f"---\n{frontmatter}\n---\n{body}")
        
        target_lang = "en" if source_lang == "es" else "es"
        base_name = filename.replace('.md', '')
        target_filename = f"{base_name}_{target_lang}.md"
        target_path = os.path.join(WRITEUPS_DIR, target_filename)
        
        if not os.path.exists(target_path):
            print(f"Found new {source_lang} writeup: {filename}. Translating to {target_lang}...")
            
            translated_body = translate_markdown(body, source=source_lang, target=target_lang)
            
            target_frontmatter = frontmatter.replace(f"lang: {source_lang}", f"lang: {target_lang}")
            
            # Translate difficulty in frontmatter if present
            diff_map = {
                "en": {"Fácil": "Easy", "Medio": "Medium", "Difícil": "Hard", "Dificil": "Hard", "Insano": "Insane"},
                "es": {"Easy": "Fácil", "Medium": "Medio", "Hard": "Difícil", "Insane": "Insano"}
            }
            for src_val, tr_val in diff_map[target_lang].items():
                target_frontmatter = target_frontmatter.replace(f"dificultad: {src_val}", f"dificultad: {tr_val}")

            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(f"---\n{target_frontmatter}\n---\n{translated_body}")
                
            print(f"Produced -> {target_filename}\n")

if __name__ == "__main__":
    process_writeups()
