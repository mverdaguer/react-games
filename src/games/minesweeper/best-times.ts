import { createBestStore } from "@/games/shared/storage"
import type { Level } from "./logic"

export type BestTimes = Partial<Record<Level, number>>

const KEY = "minesweeper:best-times:v1"

const levels: Level[] = ["beginner", "intermediate", "expert"]

const best = createBestStore(KEY, levels, (time, stored) => time < stored)

export const loadBestTimes = best.load
export const saveBestTime = best.save
