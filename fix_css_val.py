
import os

root_dir = r"c:\Users\Stanj\QualitySites\QL_Test"

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".html"):
            target_file = os.path.join(root, file)
            try:
                with open(target_file, 'rb') as f:
                    content = f.read().decode('utf-8')
                
                original_content = content
                # Fix 1: Remove empty background property
                content = content.replace("background:;", "")
                # Fix 2: Remove empty color property at end of block
                content = content.replace("color:}", "}")
                
                if content != original_content:
                    with open(target_file, 'wb') as f:
                        f.write(content.encode('utf-8'))
                    print(f"Fixed CSS in {target_file}")
            except Exception as e:
                print(f"Error processing {target_file}: {e}")
