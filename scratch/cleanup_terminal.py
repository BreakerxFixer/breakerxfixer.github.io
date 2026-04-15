import re

file_path = '/home/k1r0x/Desktop/breakerxfixer.github.io/terminal.html'
with open(file_path, 'r') as f:
    content = f.read()

def remove_duplicate_block(text, pattern, opener, closer, comment):
    matches = list(re.finditer(pattern, text))
    if len(matches) > 1:
        print(f"Removing duplicate for {pattern}")
        second_start = matches[1].start()
        count = 1
        pos = text.find(opener, second_start) + 1
        while count > 0 and pos < len(text):
            if text[pos] == opener: count += 1
            elif text[pos] == closer: count -= 1
            pos += 1
        return text[:second_start] + f'    // {comment}' + text[pos:]
    return text

# Remove duplicates
content = remove_duplicate_block(content, r'const BOOT = \[', '[', ']', 'BOOT duplicate removed')
content = remove_duplicate_block(content, r'const _VFILES_DEFAULT = \{', '{', '}', '_VFILES_DEFAULT duplicate removed')

# Handle _savedVF (single line)
matches = list(re.finditer(r'const _savedVF = localStorage', content))
if len(matches) > 1:
    print("Removing duplicate for _savedVF")
    second_start = matches[1].start()
    end_of_line = content.find(';', second_start) + 1
    content = content[:second_start] + '    // _savedVF duplicate removed' + content[end_of_line:]

with open(file_path, 'w') as f:
    f.write(content)
