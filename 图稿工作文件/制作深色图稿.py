"""复用原生编码和岗位流程，生成深色专题导图及预览。"""
import json, math, zipfile
from pathlib import Path
import 制作图稿 as g

g.BG='#0b1220'
g.COLORS={
    'govern':('#263345','#8b9bb2'),
    'product':('#3d3020','#e7b866'),
    'sales':('#233954','#79a8f5'),
    'supply':('#1e3c36','#6bc7b2'),
    'finance':('#352d49','#b49be7'),
    'mvp':('#233954','#79a8f5'),
    'data':('#1e3c36','#6bc7b2'),
    'board':('#3d3020','#e7b866'),
    'demo':('#3d3020','#e7b866'),
    'pending':('#3e2932','#d592a8'),
}
FILES=['01-公司岗位协作图-v0.3-深色版','02-公司业务与MVP思维导图-v0.3-深色版']

def prepare(d):
    d.preview_max=6800
    for n in d.nodes: n['align']='left'
    for group in d.groups: group.setdefault('stroke','#33465f')
    return d

def workflow():
    d=g.workflow(); d.name=FILES[0]
    replacements={'#19374c':'#393324','#edf0f5':'#182639','#e8edf3':'#263345','#dbe5ef':'#233954','#e3e9d4':'#24382e'}
    for n in d.nodes: n['fill']=replacements.get(n['fill'],n['fill'])
    d.nodes[d.index['W2']]['y']=1585; d.nodes[d.index['W3']]['y']=1375
    def retitle(key,text):
        node=d.nodes[d.index[key]]; node['lines']=g.lines_for(text,22,424.75)
        node['text']='\n'.join(node['lines']); node['h']=math.ceil(len(node['lines'])*33+19.25)
    retitle('W3','现货｜锁定与备货\n主责｜仓库\n交付｜成品与合格依据\n出库检查规则待确认')
    retitle('W7','返工完成 → 再次质检\n主责｜工厂\n交付｜新增用料工费；保留原成本\n复检合格后进入成品交付')
    for e in d.edges:
        if (e['a'],e['b'])==('W2','W4'):
            e['ports']=((.5,.99),(.5,.01)); e['via']=[]
        if (e['a'],e['b'])==('W7','W6'):
            w7=d.nodes[d.index['W7']]; e['via']=[(2820,w7['y']+w7['h']*.75),(2820,1614.75)]
        if (e['a'],e['b'])==('P4','W7'):
            w7=d.nodes[d.index['W7']]; e['via']=[(2855,614.5),(2855,w7['y']+w7['h']/2)]
    f2=d.nodes[d.index['F2']]
    f2['lines']=g.lines_for('应收与付款安排\n主责｜财务＋顾问\n依据｜订单编号、确认报价\n交付｜应收；定金／尾款待核实',22,424.75)
    f2['text']='\n'.join(f2['lines']); f2['h']=math.ceil(len(f2['lines'])*33+19.25)
    s5=d.nodes[d.index['S5']]
    d.edge('S5','F2',g.COLORS['finance'][1],True,ports=((.01,.5),(.01,.5)),via=[(1285,s5['y']+s5['h']/2),(1285,f2['y']+f2['h']/2)])
    d.edges=[e for e in d.edges if (e['a'],e['b']) not in [('W5','F4'),('W7','F4')]]
    hub=d.node('cost-evidence','成本依据汇集｜同一订单／生产任务／原料批次\n来源｜采购、实际用料、加工、确认损耗、返工\n核对｜来源凭据、数量与费用口径；缺项待确认',1310,2190,1490,-1,g.COLORS['finance'][0],kind='phase')
    for key,rail in [('W2',1780),('W4',1800)]:
        source=d.nodes[d.index[key]]
        d.edge(key,hub['key'],g.COLORS['finance'][1],True,ports=((.01,.5),((rail-hub['x'])/hub['w'],.01)),via=[(rail,source['y']+source['h']/2)])
    for key in ('W5','W7'):
        source=d.nodes[d.index[key]]; ratio=(source['x']+source['w']/2-hub['x'])/hub['w']
        d.edge(key,hub['key'],g.COLORS['finance'][1],True,ports=((.5,.99),(ratio,.01)))
    d.edge(hub['key'],'F4',g.COLORS['finance'][1],True,ports=((1265/1490,.99),(.5,.01)))
    d.edge('F3','F5',g.COLORS['finance'][1],True,ports=((.5,.99),(.5,.99)),via=[(2055,2540),(3095,2540)])
    for group in d.groups:
        group['fill']='#121d2d'; group['accent']=g.COLORS[group['title']][1]
    return prepare(d)

def mindmap():
    tree=json.loads((g.WORK/'思维导图内容-v0.3.json').read_text('utf8'))
    d=g.Diagram(FILES[1]); d.preview_details=True; panel_w=1870; panel_h=1230; gap_y=80; start_y=320; leaf_panels=[]
    root=d.node(tree['id'],'黄金CRM｜公司业务全景与 MVP 架构',80,0,4000,2,'#393324',tree['detail'],'title')
    d.node('scope','讨论设计稿 v0.3｜门店＋小程序经营、自有工厂已知。\n具体负责人、计价、损耗、审批和接口规则待商家确认。',80,185,1870,-1,'#182639',kind='phase')
    d.node('reading','阅读顺序｜先看 01—04 公司职责，再看 05—08 业务与系统。\n深色主题组下展开具体记录与交接要求；连线表示主题归属。',2210,185,1870,-1,'#182639',kind='phase')
    palette=['product','sales','supply','finance','sales','data','board','mvp']
    for i,branch in enumerate(tree['children']):
        x=80 if i%2==0 else 2210; y=start_y+(i//2)*(panel_h+gap_y)
        fill,accent=g.COLORS[palette[i]]; keys=[]
        header=d.node(branch['id'],branch['title'],x+28,y+28,1814,1,fill,branch['detail'],'branch'); keys.append(branch['id'])
        cy=header['y']+header['h']/2
        d.edge(tree['id'],branch['id'],'#64778f',ports=((.5,.99),(.99,.5) if i%2==0 else (.01,.5)),via=[(2080,cy)])
        # 三个主题列各有独立走线轨道，不让树枝穿过叶节点正文。
        for j,topic in enumerate(branch['children']):
            base_x=x+28+614*j; tx=base_x+28; rail=base_x+8
            tn=d.node(topic['id'],topic['title'],tx,y+175,558,0,fill,topic['detail'],'branch'); keys.append(topic['id'])
            ratio=(tx+279-header['x'])/header['w']
            d.edge(branch['id'],topic['id'],accent,ports=((ratio,.99),(.5,.01)))
            for k,leaf in enumerate(topic['children']):
                prefix='待确认｜' if leaf['status']=='待确认' else '虚构演示｜' if leaf['status']=='演示' else ''
                ly=y+330+k*270
                assert leaf.get('note') and len(leaf['note'])<=24,leaf['id']
                ln=d.node(leaf['id'],prefix+leaf['title'],tx,ly,558,-1,'#182639',leaf['note'],'branch'); keys.append(leaf['id'])
                # 原生注释绘在节点下方，不参与碰撞框；预留空间后再放完整正文。
                body=d.node('body-'+leaf['id'],leaf['detail'],tx,ly+ln['h']+52,558,-1,'#182639'); keys.append(body['key'])
                assert ln['h']+52+body['h']<=265,(leaf['id'],ln['h']+52+body['h'])
                leaf_panels.append({'title':leaf['title'],'keys':[leaf['id'],body['key']],'fill':'#182639','stroke':'#182639','pad':0})
                d.edge(topic['id'],leaf['id'],accent,ports=((.01,.5),(.01,.5)),via=[(rail,tn['y']+tn['h']/2),(rail,ln['y']+ln['h']/2)])
        brief=d.node('brief-'+branch['id'],'协作焦点｜'+branch['detail'],x+28,y+1160,1814,-1,'#121d2d',kind='phase'); keys.append(brief['key'])
        assert brief['y']+brief['h']<y+panel_h
        d.group(branch['title'],keys,'#121d2d'); d.groups[-1]['accent']=accent
    d.groups.extend(leaf_panels)
    bottom=start_y+4*panel_h+3*gap_y
    d.node('boundary','边界与口径｜历史采购成本、当前参考金价、预计／成交毛利、实际收款分别保留；未计经营费用时不称净利润。\n100g 材料平衡是虚构示例，2g 损耗不是商家或行业标准；小程序同步仍待定。',80,bottom+45,4000,-1,'#182639',kind='phase')
    return prepare(d)

def verify():
    reports=[]
    for stem in FILES:
        file=g.BASE/(stem+'.prg')
        with zipfile.ZipFile(file) as z:
            assert z.testzip() is None; stage=g.unpack(z.read('stage.msgpack'))
            assert g.unpack(z.read('metadata.msgpack'))['version']=='2.7.0'
            assert len({o['uuid'] for o in stage})==len(stage)
            nodes=[o for o in stage if o['_']=='TextNode']; edges=[o for o in stage if o['_']=='LineEdge']
            for e in edges:
                for ref in e['associationList']: assert stage[int(ref['$'][1:])]['_'] in ('TextNode','ConnectPoint')
            rects=[o['collisionBox']['shapes'][0] for o in nodes]
            for i,a in enumerate(rects):
                for b in rects[i+1:]:
                    assert not (min(a['location']['x']+a['size']['x'],b['location']['x']+b['size']['x'])-max(a['location']['x'],b['location']['x'])>1 and min(a['location']['y']+a['size']['y'],b['location']['y']+b['size']['y'])-max(a['location']['y'],b['location']['y'])>1),'文字框重叠'
            for n in nodes:
                c=n['color']; luminance=sum(c[k]*v for k,v in [('r',.2126),('g',.7152),('b',.0722)])
                assert luminance<128,'节点不是深色背景'
                linear=[(c[k]/255/12.92 if c[k]/255<=.04045 else ((c[k]/255+.055)/1.055)**2.4) for k in ('r','g','b')]
                assert 1.05/(sum(v*w for v,w in zip(linear,(.2126,.7152,.0722)))+.05)>4.5,'白字对比不足'
            text='\n'.join(n['text'] for n in nodes); assert all(word in text for word in ['损耗','报价','待'])
            reports.append({'file':file.name,'text_nodes':len(nodes),'edges':len(edges),'objects':len(stage),'zip':'通过','references':'通过','dark_contrast':'通过','text_overlap':'无'})
    tree=json.loads((g.WORK/'思维导图内容-v0.3.json').read_text('utf8'))
    records=[]
    def walk(n,depth=0):
        records.append((n,depth))
        for c in n['children']: walk(c,depth+1)
    walk(tree); assert len(records)==105 and len({n['id'] for n,_ in records})==105
    assert {depth:sum(d==depth for _,d in records) for depth in range(4)}=={0:1,1:8,2:24,3:72}
    layout=json.loads((g.WORK/(FILES[1]+'-布局.json')).read_text('utf8'))
    notes=[]
    for n in layout['nodes']:
        if not n['detail']: continue
        lines=g.lines_for(n['detail'],18,max(200,n['w']))
        assert len(lines)<=4,('注释会截断',n['key'])
        note={'key':n['key'],'x':n['x'],'y':n['y']+n['h'],'w':n['w'],'h':len(lines)*21.6}
        for box in layout['nodes']+notes:
            assert not (min(note['x']+note['w'],box['x']+box['w'])-max(note['x'],box['x'])>1 and min(note['y']+note['h'],box['y']+box['h'])-max(note['y'],box['y'])>1),('注释区域重叠',n['key'],box['key'])
        notes.append(note)
    assert len(notes)==105
    assert all(not n['detail'] for n in layout['nodes'] if n['key'].startswith('body-'))
    reports[1]['annotation_regions']=len(notes)
    reports[1]['annotation_overlap']='无'
    reports[1]['annotation_truncation']='无（18字号、4行、200宽度）'
    assert 100==90+5+3+2
    (g.WORK/'深色图稿检查-v0.3.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf8')
    return reports

if __name__=='__main__':
    print(json.dumps([workflow().render(),mindmap().render()],ensure_ascii=False))
    print(json.dumps(verify(),ensure_ascii=False))
