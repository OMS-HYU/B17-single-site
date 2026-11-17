TRACK='single'
BASE_URL='https://oms-hyu.github.io/B17-single-site/'
import hashlib,json,pathlib,struct
root=pathlib.Path(__file__).resolve().parent
latest=json.loads((root/'results/latest.json').read_text(encoding='utf-8'))
assert latest['research']==TRACK
for row in json.loads((root/'results/manifest.json').read_text(encoding='utf-8'))['files']:
 p=root/row['path'];data=p.read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256'],p
 if p.suffix=='.png':assert data[:8]==b'\x89PNG\r\n\x1a\n' and len(data)>32 and struct.unpack('>II',data[16:24])[0]>0,p
for r in latest['experiments']:
 assert r['research']==TRACK
 for key in ['image_url','evaluation_url']:
  if r.get(key):assert r[key].startswith(BASE_URL) and (root/r[key][len(BASE_URL):]).is_file(),r[key]
for p in root.rglob('*'):
 if '.git' in p.parts or not p.is_file():continue
 assert p.suffix.lower() not in ['.npy','.npz','.zip','.pem','.key'],p
 if p.suffix in ['.json','.html','.js','.css']:
  s=p.read_text(encoding='utf-8');assert 'C:\\Users\\' not in s and 'sk-proj-' not in s,p
print('Verified independent research, manifest hashes, JSON links and PNG headers.')
