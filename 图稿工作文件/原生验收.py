"""只读查询当前已打开的本任务图稿，核对原生加载后的正文与布局。"""
import socket, json, uuid, sys
from pathlib import Path
from 制作图稿 import BASE, WORK

def check(path):
    layout=json.loads((WORK/(path.stem+'-布局.json')).read_text('utf8'))
    request={'requestId':str(uuid.uuid4()),'projectPath':str(path),'toolName':'get_all_nodes','input':{}}
    with socket.create_connection(('127.0.0.1',59058),5) as s:
        s.settimeout(15); s.sendall((json.dumps(request)+'\n').encode('utf8'))
        response=json.loads(s.makefile('rb').readline())
    assert response.get('ok'),response
    objects=response['value']['objects']; texts=[o for o in objects if o.get('text')]
    expected=[n['text'] for n in layout['nodes']]
    assert sorted(o['text'] for o in texts)==sorted(expected),'正文未完整加载'
    pairs=[]
    for i,a in enumerate(texts):
        for b in texts[i+1:]:
            ap,bp=a['position'],b['position']; az,bz=a['size'],b['size']
            if min(ap['x']+az['width'],bp['x']+bz['width'])-max(ap['x'],bp['x'])>1 and min(ap['y']+az['height'],bp['y']+bz['height'])-max(ap['y'],bp['y'])>1:
                pairs.append((a['ref'],b['ref']))
    assert not pairs,pairs
    result={'file':path.name,'native_open':'通过','text_nodes':len(texts),'loaded_objects':len(objects),'all_text_matches':'通过','native_text_overlap':'无','runtime_port':59058}
    (WORK/(path.stem+'-原生加载检查.json')).write_text(json.dumps({'result':result,'objects':objects},ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__': check(BASE/sys.argv[1])
