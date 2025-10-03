import Home from "./Component/home"
import ScoresData from "./Component/Score"
import { Route, Routes, useNavigate } from "react-router-dom"

function App() {
  const navigate = useNavigate()
  return (
    <div className="">
       <nav className="bg-green-500 text-white px-4 sm:px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Judging System</h1>
          <ul className="hidden md:flex items-center gap-6 text-lg font-medium">
            <li className="hover:text-green-200 cursor-pointer transition" onClick={()=> navigate('/')}>Home</li>
            <li className="hover:text-green-200 cursor-pointer transition" onClick={()=> navigate('/score')}>Scores Data</li>
          </ul>
        </div>
      </nav>
      <Routes>
            
        <Route element={<Home/>} path=""/>
        <Route element={<ScoresData/>} path="/score"/>
      </Routes>
      
    </div>
  )
}

export default App
