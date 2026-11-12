content = open('d:/projects/worship/src/app/page.tsx', encoding='utf-8').read()

old_marker = '      }} />}\n    </div>'
new_section = '''      }} />}
      {duplicateTarget && (
        <PromptDialog
          title="Duplicate assembly"
          label="New title"
          defaultValue={`${duplicateTarget.title || 'Untitled assembly'} (copy)`}
          confirmLabel="Duplicate"
          onCancel={() => setDuplicateTarget(null)}
          onConfirm={(title) => {
            create(duplicateTarget, title);
            setDuplicateTarget(null);
          }}
        />
      )}
    </div>'''

if old_marker in content:
    content = content.replace(old_marker, new_section, 1)
    open('d:/projects/worship/src/app/page.tsx', 'w', encoding='utf-8').write(content)
    print('OK - PromptDialog injected')
else:
    print('NOT FOUND')
    idx = content.find('}} />}')
    print('Found }} />} at index:', idx)
    print(repr(content[idx:idx+50]))
