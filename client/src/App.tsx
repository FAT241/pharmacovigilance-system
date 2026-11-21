import React from 'react'

import { ConfigProvider, App as AntdApp } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import './app.css'
import { ServerWorkspace } from './features/server-workspace/ServerWorkspace'

dayjs.locale('vi')

export const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#0284c7',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorInfo: '#0284c7',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBgLayout: '#f8fafc',
          colorBorderSecondary: '#e2e8f0',
          controlHeight: 38,
          fontSize: 14,
          lineHeight: 1.6,
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Card: {
            headerHeight: 48,
            borderRadiusLG: 10,
          },
          Button: {
            controlHeight: 38,
            borderRadius: 6,
          },
          Table: {
            headerBg: '#f4f8fc',
            headerColor: '#334e68',
            rowHoverBg: '#f0f7ff',
            borderRadius: 8,
          },
          Tag: {
            borderRadiusSM: 4,
          },
          Modal: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <AntdApp>
        <ServerWorkspace />
      </AntdApp>
    </ConfigProvider>
  )
}

export default App

