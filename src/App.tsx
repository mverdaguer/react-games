import { Route, Routes } from "react-router"

import { AppLayout } from "@/components/layout/AppLayout"
import { GamePage } from "@/pages/GamePage"
import { Home } from "@/pages/Home"
import { NotFound } from "@/pages/NotFound"

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="games/:slug" element={<GamePage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
