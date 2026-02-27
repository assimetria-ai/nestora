import { Route } from 'react-router-dom'
import { NestoraDashboardPage } from '../../pages/app/@custom/NestoraDashboardPage'

export const customRoutes: React.ReactElement[] = [
  <Route key="nestora-dashboard" path="/app/properties" element={<NestoraDashboardPage />} />,
]
