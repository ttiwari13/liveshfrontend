import React from 'react'
import { User, Bell, HomeIcon, History,Sun,Moon} from 'lucide-react'

const MenuBar = () => {
  const menuItems = [
    { icon: <HomeIcon />, label: 'Home' },
    { icon: <History />, label: 'History' },
    { icon: <Bell />, label: 'Notifications' },
    { icon: <User />, label: 'Profile' },
    { icon:<Sun/>,label:'Theme'},
  ]

  return (
    <div className="flex flex-col gap-4">
      {menuItems.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200"
        >
          <div className="text-blue-400">{item.icon}</div>
          <span className="text-gray-200 font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default MenuBar
