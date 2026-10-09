"""生成可编辑 Project Graph 文件与同布局矢量预览；不写业务系统。"""
import json, math, struct, uuid, zipfile, html, io
from pathlib import Path
from PIL import ImageFont, Image, ImageDraw

BASE = Path(r'E:\Projects\黄金CRM')
WORK = BASE / '图稿工作文件'
FONT = r'C:\Windows\Fonts\msyh.ttc'
BG = '#f6f7f9'
COLORS = {
    'govern': ('#dae1ec', '#43566f'),
    'product': ('#f9e7bd', '#ac7c20'),
    'sales': ('#d4e8f7', '#3272a8'),
    'supply': ('#d7ebe3', '#377f68'),
    'finance': ('#e4def2', '#766099'),
    'mvp': ('#d9e5f0', '#466988'),
    'data': ('#deebef', '#497b88'),
    'board': ('#e3e9d4', '#738441'),
    'demo': ('#f6dfc9', '#b97845'),
    'pending': ('#f0dfe3', '#a76877'),
}

# 原生格式是 ZIP + MessagePack；只实现本图所需的标准值，拒绝未知类型。
def pack(v):
    if v is None: return b'\xc0'
    if isinstance(v, bool): return b'\xc3' if v else b'\xc2'
    if isinstance(v, int):
        if 0 <= v < 128: return bytes([v])
        if -32 <= v < 0: return bytes([256 + v])
        for lo, hi, tag, fmt in [(0,255,0xcc,'B'),(0,65535,0xcd,'H'),(0,2**32-1,0xce,'I'),(-128,127,0xd0,'b'),(-32768,32767,0xd1,'h'),(-2**31,2**31-1,0xd2,'i')]:
            if lo <= v <= hi: return bytes([tag]) + struct.pack('>'+fmt, v)
        return b'\xd3' + struct.pack('>q', v)
    if isinstance(v, float): return b'\xcb' + struct.pack('>d',v)
    if isinstance(v, str):
        b=v.encode('utf8'); n=len(b)
        head=bytes([0xa0+n]) if n<32 else (b'\xd9'+struct.pack('>B',n) if n<256 else b'\xda'+struct.pack('>H',n) if n<65536 else b'\xdb'+struct.pack('>I',n))
        return head+b
    if isinstance(v, list):
        n=len(v); head=bytes([0x90+n]) if n<16 else b'\xdc'+struct.pack('>H',n) if n<65536 else b'\xdd'+struct.pack('>I',n)
        return head+b''.join(pack(x) for x in v)
    if isinstance(v, dict):
        n=len(v); head=bytes([0x80+n]) if n<16 else b'\xde'+struct.pack('>H',n) if n<65536 else b'\xdf'+struct.pack('>I',n)
        return head+b''.join(pack(k)+pack(x) for k,x in v.items())
    raise TypeError(type(v))

def unpack(data):
    pos=0
    def read(n):
        nonlocal pos
        result=data[pos:pos+n]; pos+=n
        if len(result)!=n: raise ValueError('MessagePack截断')
        return result
    def number(fmt): return struct.unpack('>'+fmt,read(struct.calcsize(fmt)))[0]
    def value():
        t=read(1)[0]
        if t<0x80: return t
        if t>=0xe0: return t-256
        if 0xa0<=t<0xc0: return read(t-0xa0).decode('utf8')
        if 0x90<=t<0xa0: return [value() for _ in range(t-0x90)]
        if 0x80<=t<0x90: return {value():value() for _ in range(t-0x80)}
        if t==0xc0: return None
        if t in (0xc2,0xc3): return t==0xc3
        if t in (0xcc,0xcd,0xce,0xcf,0xd0,0xd1,0xd2,0xd3,0xca,0xcb): return number({0xcc:'B',0xcd:'H',0xce:'I',0xcf:'Q',0xd0:'b',0xd1:'h',0xd2:'i',0xd3:'q',0xca:'f',0xcb:'d'}[t])
        if t in (0xd9,0xda,0xdb): return read(number({0xd9:'B',0xda:'H',0xdb:'I'}[t])).decode('utf8')
        if t in (0xdc,0xdd): return [value() for _ in range(number('H' if t==0xdc else 'I'))]
        if t in (0xde,0xdf): return {value():value() for _ in range(number('H' if t==0xde else 'I'))}
        raise ValueError(f'未支持的MessagePack类型 {t:x}')
    result=value()
    if pos!=len(data): raise ValueError('MessagePack有尾随数据')
    return result

def color(hexcode):
    return {'_':'Color', **{k:int(hexcode[i:i+2],16) for k,i in [('r',1),('g',3),('b',5)]}, 'a':1}
def vector(x,y): return {'_':'Vector','x':x,'y':y}
def collision(x,y,w,h):
    return {'_':'CollisionBox','shapes':[{'_':'Rectangle','location':vector(x,y),'size':vector(w,h)}]}
def lines_for(text,size,width):
    f=ImageFont.truetype(FONT,size); lines=[]; forbidden='，。；：！？、）》】〕”’'
    for p in text.split('\n'):
        current=''
        for c in p:
            if current and f.getlength(current+c)>width:
                if c in forbidden and len(current)>1:
                    lines.append(current[:-1]); current=current[-1]+c
                else:
                    lines.append(current); current=c
            else: current+=c
        lines.append(current)
    # 在断行时处理禁则，避免事后搬字把下一行挤出宽度。
    return lines

class Diagram:
    def __init__(self,name): self.name=name; self.nodes=[]; self.edges=[]; self.groups=[]; self.index={}
    def node(self,key,text,x,y,w=480,level=-2,fill='#ffffff',detail='',kind='content'):
        size=math.floor(32*2**(level/2)); pad=size/32*14
        lines=lines_for(text,size,w-2*pad-6); h=math.ceil(len(lines)*size*1.5+2*pad)
        node={'key':key,'text':'\n'.join(lines),'lines':lines,'x':x,'y':y,'w':w,'h':h,'size':size,'level':level,'fill':fill,'detail':detail,'kind':kind}
        self.index[key]=len(self.nodes); self.nodes.append(node); return node
    def edge(self,a,b,tone='#8a98ae',dashed=False,ports=None,via=None):
        self.edges.append({'a':a,'b':b,'color':tone,'dashed':dashed,'ports':ports,'via':via or []})
    def group(self,title,keys,fill): self.groups.append({'title':title,'keys':keys,'fill':fill})
    def native(self):
        stage=[]
        for n in self.nodes:
            stage.append({'_':'TextNode','details':([{'type':'p','children':[{'text':n['detail']}]}] if n['detail'] else []),'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,self.name+':'+n['key'])),'text':n['text'],'collisionBox':collision(n['x'],n['y'],n['w'],n['h']),'color':color(n['fill']),'fontScaleLevel':n['level'],'sizeAdjust':'manual','fontFamily':'Microsoft YaHei','fontWeight':('bold' if n['kind'] in ('title','branch','lane','phase') else 'normal'),'borderStyle':'none'})
        route_indices={}
        for i,e in enumerate(self.edges):
            for j,(x,y) in enumerate(e['via']):
                route_indices[(i,j)]=len(stage)
                stage.append({'_':'ConnectPoint','details':[],'collisionBox':collision(x-15,y-15,30,30),'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,self.name+f':route:{i}:{j}'))})
        for i,e in enumerate(self.edges):
            a=self.nodes[self.index[e['a']]]; b=self.nodes[self.index[e['b']]]
            if e['ports']: src,tgt=e['ports']
            elif b['x']>=a['x']+a['w']: src,tgt=(.99,.5),(.01,.5)
            elif b['x']+b['w']<=a['x']: src,tgt=(.01,.5),(.99,.5)
            elif b['y']>a['y']: src,tgt=(.5,.99),(.5,.01)
            else: src,tgt=(.5,.01),(.5,.99)
            e['resolved_ports']=(src,tgt)
            refs=[self.index[e['a']]]+[route_indices[(i,j)] for j in range(len(e['via']))]+[self.index[e['b']]]
            for j,(aidx,bidx) in enumerate(zip(refs,refs[1:])):
                stage.append({'_':'LineEdge','associationList':[{'$':'/'+str(aidx)},{'$':'/'+str(bidx)}],'sourceRectangleRate':vector(*(src if j==0 else (.5,.5))),'targetRectangleRate':vector(*(tgt if j==len(refs)-2 else (.5,.5))),'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,self.name+f':edge:{i}:{j}')),'text':'','color':color(e['color']),'lineType':'dashed' if e['dashed'] else 'solid','arrowType':'default'})
        return stage
    def render(self):
        stage=self.native()
        minx=min(n['x'] for n in self.nodes)-65; miny=min(n['y'] for n in self.nodes)-65
        maxx=max(n['x']+n['w'] for n in self.nodes)+65; maxy=max(n['y']+n['h'] for n in self.nodes)+65
        width=math.ceil(maxx-minx); height=math.ceil(maxy-miny)
        svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{minx} {miny} {width} {height}">',f'<rect x="{minx}" y="{miny}" width="{width}" height="{height}" fill="{BG}"/>','<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="context-stroke"/></marker></defs>']
        scale=min(1,getattr(self,'preview_max',4200)/max(width,height)); im=Image.new('RGB',(round(width*scale),round(height*scale)),BG); draw=ImageDraw.Draw(im)
        background=Image.new('RGB',(width,height),BG); backdrop=ImageDraw.Draw(background)
        def coord(x,y): return ((x-minx)*scale,(y-miny)*scale)
        for g in self.groups:
            ns=[self.nodes[self.index[k]] for k in g['keys']]; padding=g.get('pad',20); gx=min(n['x'] for n in ns)-padding; gy=min(n['y'] for n in ns)-padding; gw=max(n['x']+n['w'] for n in ns)-gx+padding; gh=max(n['y']+n['h'] for n in ns)-gy+padding
            border=g.get('stroke','#d7dce4')
            svg.append(f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="14" fill="{g["fill"]}" stroke="{border}" stroke-width="1"/>')
            draw.rounded_rectangle([coord(gx,gy),coord(gx+gw,gy+gh)],radius=14*scale,fill=g['fill'],outline=border,width=max(1,round(scale)))
            backdrop.rounded_rectangle([(gx-minx,gy-miny),(gx+gw-minx,gy+gh-miny)],radius=14,fill=g['fill'],outline=border,width=1)
            if g.get('accent'):
                svg.append(f'<rect x="{gx+14}" y="{gy}" width="{gw-28}" height="4" fill="{g["accent"]}"/>')
                draw.rectangle([coord(gx+14,gy),coord(gx+gw-14,gy+4)],fill=g['accent'])
                backdrop.rectangle([(gx+14-minx,gy-miny),(gx+gw-14-minx,gy+4-miny)],fill=g['accent'])
        for e in self.edges:
            a=self.nodes[self.index[e['a']]]; b=self.nodes[self.index[e['b']]]; src,tgt=e['resolved_ports']; p0=(a['x']+src[0]*a['w'],a['y']+src[1]*a['h']); p3=(b['x']+tgt[0]*b['w'],b['y']+tgt[1]*b['h'])
            if src[0]==tgt[0]==.99 and abs(p0[0]-p3[0])<1:
                p1=(p0[0]+75,p0[1]); p2=(p3[0]+75,p3[1])
            elif src[0] in (.01,.99) and tgt[0] in (.01,.99):
                p1=(p0[0]+(p3[0]-p0[0])*.52,p0[1]); p2=(p0[0]+(p3[0]-p0[0])*.52,p3[1])
            else: p1=(p0[0],(p0[1]+p3[1])/2); p2=(p3[0],(p0[1]+p3[1])/2)
            dash=' stroke-dasharray="8 7"' if e['dashed'] else ''; arrow='' if self.name.startswith('02') else ' marker-end="url(#arrow)"'
            if e['via']:
                pathpoints=[p0]+e['via']+[p3]; path='M'+' L'.join(f'{p[0]},{p[1]}' for p in pathpoints)
                svg.append(f'<path d="{path}" fill="none" stroke="{e["color"]}" stroke-width="2.4" stroke-linejoin="round"{dash}{arrow}/>')
            else: svg.append(f'<path d="M{p0[0]},{p0[1]} C{p1[0]},{p1[1]} {p2[0]},{p2[1]} {p3[0]},{p3[1]}" fill="none" stroke="{e["color"]}" stroke-width="2.4"{dash}{arrow}/>')
            pts=[]
            for i in range(41):
                t=i/40; u=1-t; pts.append(coord(*(u**3*p0[k]+3*u*u*t*p1[k]+3*u*t*t*p2[k]+t**3*p3[k] for k in range(2))))
            if e['via']: pts=[coord(*p) for p in pathpoints]
            if e['dashed']:
                on=True; remaining=8*scale
                for begin,end in zip(pts,pts[1:]):
                    length=math.dist(begin,end); offset=0
                    while offset<length:
                        step=min(remaining,length-offset)
                        p=tuple(begin[k]+(end[k]-begin[k])*offset/length for k in (0,1))
                        q=tuple(begin[k]+(end[k]-begin[k])*(offset+step)/length for k in (0,1))
                        if on: draw.line([p,q],fill=e['color'],width=max(1,round(2.4*scale)))
                        offset+=step; remaining-=step
                        if remaining<.001: on=not on; remaining=(8 if on else 7)*scale
            else: draw.line(pts,fill=e['color'],width=max(1,round(2.4*scale)))
            if not self.name.startswith('02'):
                end=pts[-1]; prev=pts[-2]; angle=math.atan2(end[1]-prev[1],end[0]-prev[0]); length=15*scale; half=6*scale
                triangle=[end,(end[0]-length*math.cos(angle)+half*math.sin(angle),end[1]-length*math.sin(angle)-half*math.cos(angle)),(end[0]-length*math.cos(angle)-half*math.sin(angle),end[1]-length*math.sin(angle)+half*math.cos(angle))]
                draw.polygon(triangle,fill=e['color'])
        for n in self.nodes:
            ink='#000000' if sum(color(n['fill'])[k]*v for k,v in [('r',.2126),('g',.7152),('b',.0722)])>128 else '#ffffff'
            svg.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" rx="9" fill="{n["fill"]}"/>')
            draw.rounded_rectangle([coord(n['x'],n['y']),coord(n['x']+n['w'],n['y']+n['h'])],radius=9*scale,fill=n['fill'])
            bold=n['kind'] in ('title','branch','lane','phase'); weight='700' if bold else '400'
            boldfont=str(Path(FONT).with_name('msyhbd.ttc'))
            font=ImageFont.truetype(boldfont if bold and Path(boldfont).exists() else FONT,max(1,round(n['size']*scale)))
            for i,line in enumerate(n['lines']):
                cy=n['y']+(n['h']-len(n['lines'])*n['size']*1.5)/2+(i+.5)*n['size']*1.5
                left=n.get('align')=='left'; tx=n['x']+(n['size']/32*14 if left else n['w']/2); anchor='start' if left else 'middle'
                svg.append(f'<text x="{tx}" y="{cy}" text-anchor="{anchor}" dominant-baseline="central" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{n["size"]}" font-weight="{weight}" fill="{ink}">{html.escape(line)}</text>')
                draw.text(coord(tx,cy),line,font=font,fill=ink,anchor='lm' if left else 'mm')
            if getattr(self,'preview_details',False) and n['detail']:
                detailfont=ImageFont.truetype(FONT,max(1,round(18*scale)))
                for i,line in enumerate(lines_for(n['detail'],18,n['w'])):
                    cy=n['y']+n['h']+(i+.5)*21.6
                    svg.append(f'<text x="{n["x"]}" y="{cy}" dominant-baseline="central" font-family="Microsoft YaHei, sans-serif" font-size="18" fill="#b6c6da">{html.escape(line)}</text>')
                    draw.text(coord(n['x'],cy),line,font=detailfont,fill='#b6c6da',anchor='lm')
        svg.append('</svg>'); (BASE/(self.name+'.svg')).write_text('\n'.join(svg),encoding='utf8'); im.save(BASE/(self.name+'.png'))
        attachment=str(uuid.uuid5(uuid.NAMESPACE_URL,self.name+':background')); buffer=io.BytesIO(); background.save(buffer,format='PNG')
        stage.append({'_':'ImageNode','details':[],'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,self.name+':background-node')),'collisionBox':collision(minx,miny,width,height),'attachmentId':attachment,'scale':1,'isBackground':True})
        with zipfile.ZipFile(BASE/(self.name+'.prg'),'w',compression=zipfile.ZIP_STORED) as z:
            for filename,value in [('stage.msgpack',stage),('tags.msgpack',[]),('reference.msgpack',{'sections':{},'files':{}}),('metadata.msgpack',{'version':'2.7.0'})]: z.writestr(filename,pack(value))
            z.writestr('attachments/'+attachment+'.png',buffer.getvalue())
        (WORK/(self.name+'-布局.json')).write_text(json.dumps({'nodes':self.nodes,'edges':self.edges,'groups':self.groups},ensure_ascii=False,indent=2),encoding='utf8')
        return {'name':self.name,'nodes':len(self.nodes),'edges':len(self.edges),'width':width,'height':height}

def mindmap():
    tree=json.loads((WORK/'思维导图内容.json').read_text('utf8')); d=Diagram('02-公司业务与MVP思维导图-v0.2')
    keys=list(COLORS); groups=[]; pairheights=[]
    # 成对主题保持同一行：治理/MVP，产品/追溯，销售/看板，供应链/演示，财务/待定。
    for i in range(5):
        pair=[]
        for j in (i,i+5):
            branch=tree['children'][j]; tone,stroke=COLORS[keys[j]]; hsum=0; leaves=[]
            for child in branch['children']:
                prefix=('待确认｜' if child['status']=='待确认' else '')
                text=prefix+child['title']+'\n'+child['detail']; ls=lines_for(text,16,526)
                h=math.ceil(len(ls)*24+14); leaves.append((child,text,h)); hsum+=h+20
            pair.append((branch,tone,stroke,leaves,hsum-20,j))
        groups.append(pair); pairheights.append(max(p[4] for p in pair)+95)
    total=sum(pairheights)+4*75; mid=total/2
    root=d.node('root','黄金CRM\n业务全景\n首版 MVP',-205,mid-150,410,2,'#19374c',tree['detail'],'title'); root['y']=mid-root['h']/2
    d.node('banner','公司运作逻辑 × 岗位协作 × 客户与成本追溯',-1540,-260,3080,2,'#e8edf3',kind='title')
    d.node('note','讨论设计稿 · 2026-10-09｜门店、小程序经营与自有工厂已知；具体岗位、规则和接口待核实。',-1540,-45,3080,-1,'#edf0f5',kind='phase')
    cursor=0
    for pair,rh in zip(groups,pairheights):
        for branch,tone,stroke,leaves,hsum,j in pair:
            side=-1 if j<5 else 1; lx=-1550 if side==-1 else 1010; bx=-950 if side==-1 else 510
            center=cursor+rh/2
            title=branch['title'].replace('｜','｜\n',1)
            bn=d.node(branch['id'],title,bx,center-75,440,1,tone,branch['detail'],'branch'); bn['y']=center-bn['h']/2
            # 主分支的细节存于原生备注，完整正文在外侧叶节点展开。
            d.edge('root',branch['id'],stroke)
            y=center-hsum/2
            for child,text,h in leaves:
                fill='#f2e4e7' if child['status']=='待确认' else '#fff4e5' if child['status']=='演示' else tone
                leaf=d.node(child['id'],text,lx,y,540,-2,fill,child['detail'])
                assert leaf['h']==h
                d.edge(branch['id'],child['id'],stroke); y+=h+20
        cursor+=rh+75
    d.node('legend','阅读方式：先看中央与彩色主分支，再放大阅读外侧细节。连线表示主题归属；操作先后见岗位协作图。',-1540,total+65,3080,-1,'#edf0f5',kind='phase')
    return d

def workflow():
    d=Diagram('01-公司岗位协作图-v0.2'); col=lambda i:270+(i-1)*520
    d.node('title','黄金CRM｜公司岗位协作与业务交接',0,0,3440,2,'#19374c',kind='title')
    d.node('scope','讨论设计稿 · 2026-10-09｜按职责分工，可一人兼岗；流程为建议，具体负责人、报价与审批规则待商家确认。',0,175,3440,-1,'#edf0f5',kind='phase')
    d.node('T1','经营负责人｜目标、产品方向与预算',0,235,1690,-1,COLORS['govern'][0],kind='phase')
    d.node('T2','经营负责人｜价格例外、超预算、重大损耗与退款审批（条件待定）',1750,235,1690,-1,COLORS['govern'][0],kind='phase')
    for i,t in enumerate(['需求登记','方案报价','确认立单','备货与生产','质检与交付','售后与复盘'],1): d.node('phase'+str(i),f'0{i}｜{t}',col(i),345,450,-1,'#e8edf3',kind='phase')
    lanes=[('product','产品与成本\n产品负责人\n珠宝设计师',435,415),('sales','销售与利润\n品牌／线上运营\n店长／门店顾问',895,415),('supply','供应链与商品\n采购／工厂\n质检／仓库',1355,910),('finance','财务与资金\n收款核对\n成本复核',2310,330)]
    for k,t,y,h in lanes:
        n=d.node('lane-'+k,t,0,y+25,205,-1,COLORS[k][0],kind='lane')
    def n(key,title,owner,out,phase,y,k): return d.node(key,f'{title}\n主责｜{owner}\n交付｜{out}',col(phase),y,450,-1,COLORS[k][0],kind='content')
    n('P1','款式与材料方案','产品负责人／设计师','款式、材料组成、设计版本',2,460,'product')
    n('P2','标准用料与成本估算','产品＋工厂协作','计划用量、预计加工费',2,665,'product')
    n('P3','设计版本确认','设计师＋顾问记录客户意见','定制生产依据；现货引用版本',3,555,'product')
    n('P4','设计变更与返工方案','设计师＋工厂','变更原因、费用与重新确认',5,555,'product')
    n('P5','产品迭代','产品负责人','成本、销售与客诉改善方案',6,555,'product')
    n('S1','获客与顾问分配','品牌运营／店长','客户来源、预约、负责顾问',1,920,'sales')
    n('S2','需求与意向登记','顾问','预算、用途、意向与交期',1,1120,'sales')
    n('S3','报价快照','顾问','商品版本、价源、销售工费',2,1015,'sales')
    n('S4','客户确认报价','顾问','确认内容、交期与变更条件',3,920,'sales')
    n('S5','立单与履约分流','顾问／店长','订单编号：现货或定制',3,1120,'sales')
    n('S6','交付与客户验收','顾问＋仓库','商品、交付时间、签收结果',5,1015,'sales')
    n('S7','售后、取消与变更受理','顾问','原因、成本保留、处理结果',6,1015,'sales')
    n('W1','库存与供料核对','仓库＋采购','可用成品、材料及缺口',3,1375,'supply')
    n('W2','缺料时采购批次入库','采购＋仓库','批次、规格、价量与位置',4,1375,'supply')
    n('W3','现货｜锁定与备货','仓库','锁定成品、待交付清单',4,1585,'supply')
    n('W4','定制｜领料与加工','工厂','任务号、来源批次、实际工费',4,1795,'supply')
    n('W5','余料、回收料与损耗','工厂记录＋仓库核量','退料、在制、差异与确认损耗',4,2005,'supply')
    n('W6','质检｜合格或退回返工','质检','不合格项、原因及处理要求',5,1585,'supply')
    n('W7','返工执行与再次送检','工厂','新增用料工费、保留首次成本',5,1795,'supply')
    n('W8','成品入库与交付出库','仓库','成品编号、材料关联、出库记录',5,1375,'supply')
    n('W9','售后回件与处置','仓库＋质检＋工厂','回件、检验、维修或入库结果',6,1585,'supply')
    n('F1','成本与报价复核','财务＋产品','依据与异常；审批条件待定',2,2340,'finance')
    n('F2','应收与付款安排','财务＋顾问','订单应收、定金／尾款待核实',3,2340,'finance')
    n('F3','收款与退款核对','财务','实收、退款、凭证与差异',4,2340,'finance')
    n('F4','实际成本复核','财务＋工厂＋仓库','材料、加工、损耗、返工费用',5,2340,'finance')
    n('F5','毛利与资金分别汇总','财务','约定成本口径、资金与未结清',6,2340,'finance')
    for k,t,y,h in lanes:
        d.group(k,['lane-'+k]+[x['key'] for x in d.nodes if x['key'].startswith({'product':'P','sales':'S','supply':'W','finance':'F'}[k])],{'product':'#fff9eb','sales':'#f0f7fc','supply':'#edf7f2','finance':'#f4f1f8'}[k])
    solid=[('S1','S2'),('S2','S3'),('S3','S4'),('S4','S5'),('S6','S7'),('P1','P2'),('P2','S3'),('S4','P3'),('S5','W1'),('W1','W2'),('W1','W3'),('W2','W4'),('P3','W4'),('W4','W5'),('W4','W6'),('W5','W6'),('W3','W8'),('W6','W8'),('W6','W7'),('W7','W6'),('W8','S6'),('S7','W9'),('F2','F3'),('F4','F5')]
    for a,b in solid:
        k='sales' if a.startswith('S') else 'product' if a.startswith('P') else 'supply' if a.startswith('W') else 'finance'
        ports=None; via=[]
        if (a,b)==('W2','W4'):
            ports=((.99,.5),(.99,.5)); via=[(2307,1434.5),(2307,1854.5)]
        elif (a,b)==('W7','W6'):
            ports=((.99,.75),(.99,.25)); via=[(2830,1884.25),(2830,1614.75)]
        d.edge(a,b,COLORS[k][1],ports=ports,via=via)
    d.edge('P4','W7',COLORS['product'][1],ports=((.99,.5),(.99,.5)),via=[(2845,614.5),(2845,1854.5)])
    for a,b in [('S3','F1'),('W5','F4'),('W7','F4')]: d.edge(a,b,COLORS['finance'][1],True)
    d.node('shared','CRM 共享记录｜客户 → 报价版本 → 订单 → 生产任务 → 实际用料／批次 → 成品 → 交付 → 收退款',0,2675,3440,-1,'#dbe5ef',kind='phase')
    d.node('feedback','经营反馈｜金价参考变化、商品成本、销售毛利、实际收款分别显示；异常回到负责岗位调查与复核。',0,2775,3440,-1,'#e3e9d4',kind='phase')
    d.node('rules','实线：业务交接　虚线：财务核对｜现货备货直接入交付；定制按确认版本生产。\n付款、生产、交付各自记录状态；取消、返工与退货保留原记录及已发生费用。',0,2875,3440,-1,'#edf0f5',kind='phase')
    return d

def verify():
    sample=WORK/'格式样本.prg'
    with zipfile.ZipFile(sample) as z:
        obj=unpack(z.read('stage.msgpack')); assert unpack(pack(obj))==obj
        assert obj[0]['_']=='TextNode' and '格式核对' in obj[0]['text']
    probe={'中文':'黄金CRM','数值':[None,True,False,-2,0,127,256,66000,1.25],'参考':{'$':'/0'}}
    assert unpack(pack(probe))==probe
    report=[]
    for file in sorted(BASE.glob('*-v0.2.prg')):
        with zipfile.ZipFile(file) as z:
            assert z.testzip() is None
            assert unpack(z.read('metadata.msgpack'))['version']=='2.7.0'
            stage=unpack(z.read('stage.msgpack')); assert len({x['uuid'] for x in stage})==len(stage)
            nodes=[x for x in stage if x['_']=='TextNode']; edges=[x for x in stage if x['_']=='LineEdge']
            for e in edges:
                for r in e['associationList']: assert stage[int(r['$'][1:])]['_'] in ('TextNode','ConnectPoint')
            rects=[n['collisionBox']['shapes'][0] for n in nodes]
            overlaps=[]
            for i,a in enumerate(rects):
                for j,b in enumerate(rects[i+1:],i+1):
                    if min(a['location']['x']+a['size']['x'],b['location']['x']+b['size']['x'])-max(a['location']['x'],b['location']['x'])>1 and min(a['location']['y']+a['size']['y'],b['location']['y']+b['size']['y'])-max(a['location']['y'],b['location']['y'])>1: overlaps.append((i,j))
            assert not overlaps,(file.name,overlaps)
            text='\n'.join(n['text'] for n in nodes)
            assert '损耗' in text and '报价' in text and '待' in text
            report.append({'file':file.name,'text_nodes':len(nodes),'edges':len(edges),'zip_integrity':'通过','unique_ids':'通过','references':'通过','node_overlap':'无'})
    assert 100==90+5+3+2
    (WORK/'文件与布局检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    return report

if __name__=='__main__':
    print(json.dumps([workflow().render(),mindmap().render()],ensure_ascii=False))
    print(json.dumps(verify(),ensure_ascii=False))
