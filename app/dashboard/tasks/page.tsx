'use server'

import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { TaskList } from "@/components/tasks/task-list"
import { calculateTaskOrder } from "@/lib/tasks"

async function updateTask(taskId: string, data: any) {
  'use server'
  
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    throw new Error("Non authentifié")
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || "fallback_secret") as any
    const userId = decoded.userId

    // Si la tâche est marquée comme complétée ou non
    if (typeof data.completed === 'boolean') {
      // Récupérer la tâche actuelle pour conserver ses valeurs
      const currentTask = await prisma.task.findUnique({
        where: {
          id: taskId,
          userId,
        },
      })

      if (!currentTask) {
        throw new Error("Tâche non trouvée")
      }

      await prisma.task.update({
        where: {
          id: taskId,
          userId,
        },
        data: {
          completed: data.completed,
          // Conserver les autres champs tels quels
          dueDate: currentTask.dueDate,
          priority: currentTask.priority,
          energyLevel: currentTask.energyLevel,
          projectId: currentTask.projectId,
          order: currentTask.order,
        },
      })
      return
    }

    // Pour les autres mises à jour
    const priorityString = data.priority !== null ? `P${data.priority}` : "P3"
    const energyString = data.energyLevel !== null ? {
      0: "Extrême",
      1: "Élevé",
      2: "Moyen",
      3: "Faible"
    }[data.energyLevel] : "Moyen"

    const order = calculateTaskOrder(priorityString, energyString)

    await prisma.task.update({
      where: {
        id: taskId,
        userId,
      },
      data: {
        ...data,
        order,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la tâche:", error)
    throw new Error("Erreur lors de la mise à jour de la tâche")
  }
}

async function deleteTask(taskId: string) {
  'use server'
  
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    throw new Error("Non authentifié")
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || "fallback_secret") as any
    const userId = decoded.userId

    await prisma.task.delete({
      where: {
        id: taskId,
        userId,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error)
    throw new Error("Erreur lors de la suppression de la tâche")
  }
}

export default async function TasksPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    redirect("/login")
  }

  let user
  try {
    user = verify(token, process.env.JWT_SECRET || "fallback_secret")
  } catch (error) {
    redirect("/login")
  }

  const userId = (user as any).userId

  const tasks = await prisma.task.findMany({
    where: {
      userId,
    },
    orderBy: [
      { order: "desc" }
    ],
    include: {
      project: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
          <p className="text-gray-600 mt-1">Gérez et organisez vos tâches efficacement</p>
        </div>
        <Link href="/dashboard/tasks/new">
          <Button className="shadow-sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle tâche
          </Button>
        </Link>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <TaskList 
          tasks={tasks} 
          onTaskUpdate={updateTask}
          onTaskDelete={deleteTask}
        />
      </div>
    </div>
  )
}

