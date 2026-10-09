import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { CRMProvider } from './store';
import { CRMApp } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ConfigProvider locale={zhCN} theme={{algorithm:theme.darkAlgorithm,token:{colorPrimary:'#dab873',colorLink:'#dab873',colorLinkHover:'#eed396',colorLinkActive:'#c3a25e',colorBgBase:'#101722',colorBgContainer:'#17212e',colorText:'#edf1f6',colorTextSecondary:'#b3bfd0',colorTextTertiary:'#b3bfd0',colorError:'#efa997',colorErrorText:'#efa997',colorBorder:'#34465b',borderRadius:8,fontSize:14,fontFamily:'"Microsoft YaHei UI", "PingFang SC", sans-serif',controlHeight:36},components:{Table:{headerBg:'#1d2b3b',rowHoverBg:'#223044',cellPaddingBlock:14},Drawer:{colorBgElevated:'#17212e'},Button:{primaryColor:'#141b26'}}}}><AntApp><CRMProvider><CRMApp/></CRMProvider></AntApp></ConfigProvider></React.StrictMode>
);
