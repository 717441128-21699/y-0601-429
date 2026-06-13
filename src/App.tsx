import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import ArchiveIntake from '@/pages/archive/ArchiveIntake'
import ArchiveList from '@/pages/archive/ArchiveList'
import BorrowApply from '@/pages/borrow/BorrowApply'
import BorrowApproval from '@/pages/borrow/BorrowApproval'
import BorrowRecords from '@/pages/borrow/BorrowRecords'
import EnvironmentMonitor from '@/pages/environment/EnvironmentMonitor'
import EnvironmentAlerts from '@/pages/environment/EnvironmentAlerts'
import EquipmentList from '@/pages/equipment/EquipmentList'
import EquipmentMaintenance from '@/pages/equipment/EquipmentMaintenance'
import SpareParts from '@/pages/equipment/SpareParts'
import StatisticsBorrowing from '@/pages/statistics/StatisticsBorrowing'
import StatisticsUtilization from '@/pages/statistics/StatisticsUtilization'
import WarehouseMap from '@/pages/warehouse/WarehouseMap'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/archive/intake" element={<ArchiveIntake />} />
          <Route path="/archive/list" element={<ArchiveList />} />
          <Route path="/borrow/apply" element={<BorrowApply />} />
          <Route path="/borrow/approval" element={<BorrowApproval />} />
          <Route path="/borrow/records" element={<BorrowRecords />} />
          <Route path="/environment/monitor" element={<EnvironmentMonitor />} />
          <Route path="/environment/alerts" element={<EnvironmentAlerts />} />
          <Route path="/equipment/list" element={<EquipmentList />} />
          <Route path="/equipment/maintenance" element={<EquipmentMaintenance />} />
          <Route path="/equipment/spare-parts" element={<SpareParts />} />
          <Route path="/statistics/borrowing" element={<StatisticsBorrowing />} />
          <Route path="/statistics/utilization" element={<StatisticsUtilization />} />
          <Route path="/warehouse/map" element={<WarehouseMap />} />
        </Route>
      </Routes>
    </Router>
  )
}
