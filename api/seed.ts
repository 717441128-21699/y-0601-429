import { v4 as uuidv4 } from 'uuid'
import db from './database.js'

export function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  const insert = db.transaction(() => {
    const users = [
      { id: uuidv4(), name: '张建国', role: 'admin', department: '信息中心', permission_level: 'admin' },
      { id: uuidv4(), name: '李文静', role: 'archivist', department: '档案管理科', permission_level: 'high' },
      { id: uuidv4(), name: '王晓明', role: 'borrower', department: '政策研究室', permission_level: 'normal' },
      { id: uuidv4(), name: '赵伟强', role: 'maintenance', department: '后勤保障部', permission_level: 'normal' },
      { id: uuidv4(), name: '陈丽华', role: 'leader', department: '办公室', permission_level: 'high' },
    ]

    const insertUser = db.prepare(
      'INSERT INTO users (id, name, role, department, permission_level) VALUES (?, ?, ?, ?, ?)'
    )
    const userIds: Record<string, string> = {}
    for (const u of users) {
      insertUser.run(u.id, u.name, u.role, u.department, u.permission_level)
      userIds[u.role] = u.id
    }

    const warehouseData = [
      { name: '文书库房', location: 'A区1楼', capacity: 5000, allowed_types: '文书,会计', allowed_secrecy: '公开,内部,秘密' },
      { name: '科技库房', location: 'A区2楼', capacity: 3000, allowed_types: '科技,电子', allowed_secrecy: '公开,内部,秘密' },
      { name: '机密库房', location: 'B区1楼', capacity: 2000, allowed_types: '文书,科技,人事', allowed_secrecy: '秘密,机密' },
      { name: '声像库房', location: 'C区1楼', capacity: 2000, allowed_types: '声像', allowed_secrecy: '公开,内部' },
    ]

    const insertWarehouse = db.prepare(
      'INSERT INTO warehouses (id, name, location, capacity, used, allowed_types, allowed_secrecy) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const warehouseIds: string[] = []

    for (const w of warehouseData) {
      const wId = uuidv4()
      insertWarehouse.run(wId, w.name, w.location, w.capacity, 0, w.allowed_types, w.allowed_secrecy)
      warehouseIds.push(wId)
    }

    const materialsByWarehouse = [
      '纸质,胶片',
      '纸质,光盘,硬盘',
      '纸质,磁带',
      '胶片,磁带,光盘',
    ]

    const insertShelf = db.prepare(
      'INSERT INTO shelves (id, warehouse_id, code, position, capacity, used, allowed_materials) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const shelfIdsByWarehouse: string[][] = []

    for (let wi = 0; wi < warehouseIds.length; wi++) {
      const wId = warehouseIds[wi]
      const shelves: string[] = []
      const rows = ['A', 'B']
      const cols = [1, 2, 3]
      let idx = 0
      for (const row of rows) {
        for (const col of cols) {
          const sId = uuidv4()
          const code = `${row}${col}区`
          const position = `${warehouseData[wi].location} ${row}排${col}列`
          insertShelf.run(sId, wId, code, position, 200, 0, materialsByWarehouse[wi])
          shelves.push(sId)
          idx++
        }
      }
      shelfIdsByWarehouse.push(shelves)
    }

    const archiveTypes = ['文书', '科技', '会计', '人事', '声像', '电子']
    const secrecyLevels = ['公开', '内部', '秘密', '机密']
    const carrierMaterials = ['纸质', '胶片', '磁带', '光盘', '硬盘']
    const fondsList = ['ZJ', 'KJ', 'RS', 'SX', 'DZ']
    const departments = ['办公室', '政策研究室', '财务处', '人事处', '信息中心', '档案管理科', '后勤保障部']

    const archiveTitles = [
      '2023年度工作会议纪要', '2023年度财务决算报告', '2023年人事任免通知汇编',
      '2022年科研项目立项批复', '2023年基建工程验收报告', '2023年度审计工作底稿',
      '2022年干部考核材料', '2023年重大决策会议记录', '2023年政府采购合同汇编',
      '2022年声像档案-重大活动影像', '2023年电子文件-公文系统数据', '2023年度预算执行报告',
      '2022年科技成果鉴定材料', '2023年职工培训记录', '2022年会计凭证汇编',
      '2023年保密工作档案', '2022年组织机构沿革', '2023年声像档案-领导视察录像',
      '2023年电子档案-系统日志备份', '2022年人事档案-离职人员卷宗',
      '2023年度党委会决议汇编', '2022年科研课题结题报告', '2023年基建项目招投标文件',
      '2023年财务审计整改报告', '2022年声像档案-庆祝活动照片', '2023年电子文件-数据库备份',
      '2023年人事调动审批材料', '2022年文书档案-重要来文', '2023年科技档案-专利申请材料',
      '2023年会计档案-银行对账单', '2022年机密档案-涉密会议纪要',
      '2023年文书档案-信访处理卷宗', '2022年电子档案-加密通信记录',
    ]

    const insertArchive = db.prepare(
      `INSERT INTO archives (id, archive_number, title, type, secrecy_level, carrier_material, fonds, year, department, description, status, warehouse_id, shelf_id, barcode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    let seqByFondsYear: Record<string, number> = {}
    const now = new Date()

    for (let i = 0; i < archiveTitles.length; i++) {
      const aId = uuidv4()
      const title = archiveTitles[i]
      const year = 2022 + (i % 2)
      const fonds = fondsList[i % fondsList.length]
      const type = archiveTypes[i % archiveTypes.length]
      const secrecy = secrecyLevels[i % secrecyLevels.length]
      const carrier = carrierMaterials[i % carrierMaterials.length]
      const dept = departments[i % departments.length]

      const key = `${fonds}-${year}`
      if (!seqByFondsYear[key]) seqByFondsYear[key] = 0
      seqByFondsYear[key]++
      const seq = String(seqByFondsYear[key]).padStart(4, '0')
      const archiveNumber = `${fonds}-${year}-${seq}`
      const barcode = `BC-${archiveNumber}`

      let targetWarehouseIdx = -1
      for (let wi = 0; wi < warehouseIds.length; wi++) {
        const allowedTypes = warehouseData[wi].allowed_types.split(',')
        const allowedSecrecy = warehouseData[wi].allowed_secrecy.split(',')
        if (allowedTypes.includes(type) && allowedSecrecy.includes(secrecy)) {
          targetWarehouseIdx = wi
          break
        }
      }
      if (targetWarehouseIdx === -1) targetWarehouseIdx = 0

      const wId = warehouseIds[targetWarehouseIdx]
      let targetShelfId = ''
      const shelvesForWarehouse = shelfIdsByWarehouse[targetWarehouseIdx]
      for (const sId of shelvesForWarehouse) {
        const shelf = db.prepare('SELECT * FROM shelves WHERE id = ?').get(sId) as any
        if (shelf && shelf.used < shelf.capacity) {
          const allowedMats = shelf.allowed_materials.split(',')
          if (allowedMats.includes(carrier)) {
            targetShelfId = sId
            break
          }
        }
      }
      if (!targetShelfId) targetShelfId = shelvesForWarehouse[0]

      const status = i < 28 ? '在库' : (i < 31 ? '借出' : '锁定')
      const createdAt = new Date(now.getTime() - (archiveTitles.length - i) * 86400000).toISOString()

      insertArchive.run(aId, archiveNumber, title, type, secrecy, carrier, fonds, year, dept, `${title}的详细描述`, status, wId, targetShelfId, barcode, createdAt)

      db.prepare('UPDATE shelves SET used = used + 1 WHERE id = ?').run(targetShelfId)
      db.prepare('UPDATE warehouses SET used = used + 1 WHERE id = ?').run(wId)
    }

    const insertBorrow = db.prepare(
      `INSERT INTO borrows (id, archive_id, user_id, purpose, borrow_type, appointment_time, expected_return, actual_return, status, approval_result, overdue_fee, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const archivesInStock = db.prepare("SELECT id FROM archives WHERE status IN ('在库','借出','锁定')").all() as any[]
    const archivesAll = db.prepare("SELECT id FROM archives").all() as any[]

    const borrowData = [
      { userIdx: 'borrower', purpose: '课题研究参考', borrow_type: '阅览', status: '已归还', approval_result: '自动审批通过', daysAgo: 45, returnDays: 10, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '撰写年度报告', borrow_type: '外借', status: '已归还', approval_result: '自动审批通过', daysAgo: 40, returnDays: 15, overdue_fee: 0 },
      { userIdx: 'leader', purpose: '决策参考', borrow_type: '阅览', status: '已归还', approval_result: '自动审批通过', daysAgo: 35, returnDays: 5, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '项目调研', borrow_type: '外借', status: '已超期', approval_result: '自动审批通过', daysAgo: 25, returnDays: 14, overdue_fee: 5.5 },
      { userIdx: 'borrower', purpose: '资料查证', borrow_type: '复制', status: '借出中', approval_result: '自动审批通过', daysAgo: 10, returnDays: 7, overdue_fee: 0 },
      { userIdx: 'leader', purpose: '会议参考', borrow_type: '阅览', status: '借出中', approval_result: '自动审批通过', daysAgo: 5, returnDays: 3, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '论文写作', borrow_type: '外借', status: '已超期', approval_result: '人工审批通过', daysAgo: 30, returnDays: 14, overdue_fee: 8.0 },
      { userIdx: 'borrower', purpose: '材料补充', borrow_type: '阅览', status: '已归还', approval_result: '自动审批通过', daysAgo: 60, returnDays: 7, overdue_fee: 0 },
      { userIdx: 'leader', purpose: '汇报材料', borrow_type: '外借', status: '借出中', approval_result: '人工审批通过', daysAgo: 8, returnDays: 7, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '审核参考', borrow_type: '阅览', status: '已通过', approval_result: '自动审批通过', daysAgo: 1, returnDays: 0, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '合同核查', borrow_type: '复制', status: '待审批', approval_result: null, daysAgo: 0, returnDays: 0, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '文献检索', borrow_type: '阅览', status: '已拒绝', approval_result: '权限不足', daysAgo: 3, returnDays: 0, overdue_fee: 0 },
      { userIdx: 'leader', purpose: '历史查询', borrow_type: '阅览', status: '已归还', approval_result: '自动审批通过', daysAgo: 50, returnDays: 3, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '数据核实', borrow_type: '外借', status: '借出中', approval_result: '自动审批通过', daysAgo: 12, returnDays: 10, overdue_fee: 0 },
      { userIdx: 'borrower', purpose: '专项研究', borrow_type: '外借', status: '已超期', approval_result: '人工审批通过', daysAgo: 28, returnDays: 14, overdue_fee: 7.0 },
    ]

    for (let i = 0; i < borrowData.length; i++) {
      const b = borrowData[i]
      const bId = uuidv4()
      const archiveIdx = i % archivesAll.length
      const archiveId = archivesAll[archiveIdx].id
      const uId = userIds[b.userIdx]

      const createdDate = new Date(now.getTime() - b.daysAgo * 86400000)
      const appointmentTime = new Date(createdDate.getTime() + 86400000).toISOString()
      const expectedReturn = new Date(createdDate.getTime() + b.returnDays * 86400000).toISOString()
      let actualReturn: string | null = null
      if (b.status === '已归还') {
        actualReturn = new Date(createdDate.getTime() + (b.returnDays - 1) * 86400000).toISOString()
      }

      insertBorrow.run(
        bId, archiveId, uId, b.purpose, b.borrow_type,
        appointmentTime, expectedReturn, actualReturn,
        b.status, b.approval_result, b.overdue_fee, createdDate.toISOString()
      )
    }

    const insertSensor = db.prepare(
      'INSERT INTO sensor_data (id, warehouse_id, temperature, humidity, light_intensity, harmful_gas, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    for (const wId of warehouseIds) {
      for (let h = 23; h >= 0; h--) {
        const sId = uuidv4()
        const timestamp = new Date(now.getTime() - h * 3600000)
        const baseTemp = 22 + (Math.random() - 0.5) * 4
        const baseHumidity = 50 + (Math.random() - 0.5) * 10
        const baseLight = 100 + Math.random() * 50
        const baseGas = 0.02 + Math.random() * 0.03

        insertSensor.run(sId, wId, Math.round(baseTemp * 10) / 10, Math.round(baseHumidity * 10) / 10, Math.round(baseLight * 10) / 10, Math.round(baseGas * 1000) / 1000, timestamp.toISOString())
      }
    }

    const insertThreshold = db.prepare(
      'INSERT INTO thresholds (id, warehouse_id, parameter, min_value, max_value) VALUES (?, ?, ?, ?, ?)'
    )

    const thresholdParams = [
      { parameter: 'temperature', min: 14, max: 24 },
      { parameter: 'humidity', min: 45, max: 60 },
      { parameter: 'light_intensity', min: 0, max: 150 },
      { parameter: 'harmful_gas', min: 0, max: 0.05 },
    ]

    for (const wId of warehouseIds) {
      for (const tp of thresholdParams) {
        insertThreshold.run(uuidv4(), wId, tp.parameter, tp.min, tp.max)
      }
    }

    const insertAlert = db.prepare(
      'INSERT INTO alerts (id, warehouse_id, type, parameter, value, threshold, status, triggered_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )

    const alertData = [
      { warehouseIdx: 0, type: '高温预警', parameter: 'temperature', value: 26.5, threshold: 24, status: '已解决', hoursAgo: 20, resolvedHoursAgo: 18 },
      { warehouseIdx: 1, type: '高湿预警', parameter: 'humidity', value: 63.2, threshold: 60, status: '已解决', hoursAgo: 15, resolvedHoursAgo: 12 },
      { warehouseIdx: 2, type: '光照超标', parameter: 'light_intensity', value: 180, threshold: 150, status: '未处理', hoursAgo: 2, resolvedHoursAgo: null },
      { warehouseIdx: 0, type: '有害气体超标', parameter: 'harmful_gas', value: 0.06, threshold: 0.05, status: '处理中', hoursAgo: 5, resolvedHoursAgo: null },
      { warehouseIdx: 3, type: '高温预警', parameter: 'temperature', value: 25.8, threshold: 24, status: '未处理', hoursAgo: 1, resolvedHoursAgo: null },
      { warehouseIdx: 1, type: '低温预警', parameter: 'temperature', value: 12.5, threshold: 14, status: '已解决', hoursAgo: 48, resolvedHoursAgo: 45 },
      { warehouseIdx: 2, type: '高湿预警', parameter: 'humidity', value: 62.1, threshold: 60, status: '未处理', hoursAgo: 3, resolvedHoursAgo: null },
    ]

    for (const a of alertData) {
      const aId = uuidv4()
      const wId = warehouseIds[a.warehouseIdx]
      const triggeredAt = new Date(now.getTime() - a.hoursAgo * 3600000).toISOString()
      const resolvedAt = a.resolvedHoursAgo ? new Date(now.getTime() - a.resolvedHoursAgo * 3600000).toISOString() : null

      insertAlert.run(aId, wId, a.type, a.parameter, a.value, a.threshold, a.status, triggeredAt, resolvedAt)
    }

    const insertEquipment = db.prepare(
      'INSERT INTO equipment (id, name, type, warehouse_id, running_hours, switch_count, status, last_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )

    const equipmentData = [
      { name: '1号除湿机', type: '除湿机', warehouseIdx: 0, running_hours: 2100, switch_count: 3200, status: '运行中' },
      { name: '2号除湿机', type: '除湿机', warehouseIdx: 1, running_hours: 1800, switch_count: 2800, status: '运行中' },
      { name: '1号加湿机', type: '加湿机', warehouseIdx: 2, running_hours: 950, switch_count: 1500, status: '运行中' },
      { name: '2号加湿机', type: '加湿机', warehouseIdx: 3, running_hours: 600, switch_count: 800, status: '停机' },
      { name: '1号通风机', type: '通风机', warehouseIdx: 0, running_hours: 3500, switch_count: 5800, status: '运行中' },
      { name: '2号通风机', type: '通风机', warehouseIdx: 1, running_hours: 2200, switch_count: 5100, status: '维修中' },
      { name: '1号空气净化器', type: '空气净化器', warehouseIdx: 2, running_hours: 1500, switch_count: 2000, status: '运行中' },
      { name: '1号恒温恒湿机组', type: '恒温恒湿机组', warehouseIdx: 3, running_hours: 4200, switch_count: 6200, status: '运行中' },
    ]

    for (const e of equipmentData) {
      const eId = uuidv4()
      const wId = warehouseIds[e.warehouseIdx]
      const lastMaint = new Date(now.getTime() - Math.floor(Math.random() * 90) * 86400000).toISOString()

      insertEquipment.run(eId, e.name, e.type, wId, e.running_hours, e.switch_count, e.status, lastMaint)
    }

    const insertTeam = db.prepare(
      'INSERT INTO maintenance_teams (id, name, members, specialty) VALUES (?, ?, ?, ?)'
    )

    const teams = [
      { name: '电气维修班组', members: '刘工,周工,吴工', specialty: '电气设备维修' },
      { name: '机械维修班组', members: '孙工,马工,朱工', specialty: '机械设备维修' },
      { name: '综合维修班组', members: '郑工,王工,冯工', specialty: '综合设备维修' },
    ]

    const teamIds: string[] = []
    for (const t of teams) {
      const tId = uuidv4()
      insertTeam.run(tId, t.name, t.members, t.specialty)
      teamIds.push(tId)
    }

    const equipmentRows = db.prepare('SELECT id FROM equipment').all() as any[]

    const insertOrder = db.prepare(
      'INSERT INTO maintenance_orders (id, equipment_id, type, description, team_id, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )

    const orderData = [
      { equipIdx: 4, type: '定期保养', description: '通风机定期保养维护', teamIdx: 1, status: '已完成', daysAgo: 30, completedDaysAgo: 27 },
      { equipIdx: 5, type: '故障维修', description: '通风机异常噪音维修', teamIdx: 1, status: '进行中', daysAgo: 3, completedDaysAgo: null },
      { equipIdx: 0, type: '定期保养', description: '除湿机运行超2000小时保养', teamIdx: 0, status: '待处理', daysAgo: 1, completedDaysAgo: null },
      { equipIdx: 7, type: '故障维修', description: '恒温恒湿机组温控失灵', teamIdx: 2, status: '待处理', daysAgo: 2, completedDaysAgo: null },
      { equipIdx: 5, type: '定期保养', description: '通风机开关次数超限保养', teamIdx: 0, status: '已完成', daysAgo: 20, completedDaysAgo: 18 },
      { equipIdx: 7, type: '定期保养', description: '恒温恒湿机组运行超4000小时保养', teamIdx: 2, status: '进行中', daysAgo: 5, completedDaysAgo: null },
    ]

    for (const o of orderData) {
      const oId = uuidv4()
      const equipId = equipmentRows[o.equipIdx]?.id
      if (!equipId) continue
      const teamId = teamIds[o.teamIdx]
      const createdDate = new Date(now.getTime() - o.daysAgo * 86400000).toISOString()
      const completedAt = o.completedDaysAgo ? new Date(now.getTime() - o.completedDaysAgo * 86400000).toISOString() : null

      insertOrder.run(oId, equipId, o.type, o.description, teamId, o.status, createdDate, completedAt)
    }

    const insertSpare = db.prepare(
      'INSERT INTO spare_parts (id, name, specification, quantity, safety_stock, warehouse_id) VALUES (?, ?, ?, ?, ?, ?)'
    )

    const sparePartsData = [
      { name: '除湿机滤网', specification: '通用型 400mm', quantity: 15, safety_stock: 10, warehouseIdx: 0 },
      { name: '加湿器雾化片', specification: '超声波 25mm', quantity: 8, safety_stock: 10, warehouseIdx: 2 },
      { name: '通风机轴承', specification: '6205-2RS', quantity: 4, safety_stock: 5, warehouseIdx: 0 },
      { name: '温湿度传感器', specification: 'SHT30', quantity: 12, safety_stock: 10, warehouseIdx: 1 },
      { name: '空气净化器滤芯', specification: 'HEPA H13', quantity: 3, safety_stock: 5, warehouseIdx: 2 },
      { name: '恒温恒湿压缩机', specification: '2P涡旋式', quantity: 2, safety_stock: 3, warehouseIdx: 3 },
      { name: '除湿机压缩机', specification: '1P旋转式', quantity: 6, safety_stock: 5, warehouseIdx: 0 },
      { name: '风机皮带', specification: 'A-68', quantity: 20, safety_stock: 15, warehouseIdx: 1 },
      { name: '电磁阀', specification: 'DN15 220V', quantity: 5, safety_stock: 8, warehouseIdx: 2 },
      { name: '接触器', specification: 'CJX2-2510', quantity: 7, safety_stock: 10, warehouseIdx: 3 },
      { name: '热继电器', specification: 'JR36-20', quantity: 9, safety_stock: 8, warehouseIdx: 0 },
      { name: '控制面板', specification: '7寸触摸屏', quantity: 2, safety_stock: 3, warehouseIdx: 1 },
    ]

    for (const sp of sparePartsData) {
      const spId = uuidv4()
      const wId = warehouseIds[sp.warehouseIdx]

      insertSpare.run(spId, sp.name, sp.specification, sp.quantity, sp.safety_stock, wId)
    }
  })

  insert()
  console.log('Database seeded successfully')
}
