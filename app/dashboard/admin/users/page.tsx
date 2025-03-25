"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { UserPlus, Users, ClipboardList, Plus, Calendar, CalendarIcon, Eye } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { AdminRequiredPage } from "@/components/auth/admin-required"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  companyName?: string
}

export default function UsersAdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLocale()
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<any>(null)
  
  // État pour le modal d'assignation de tâche
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedUserName, setSelectedUserName] = useState("")
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "3", // P3 par défaut
    energyLevel: "2", // Moyen par défaut
    dueDate: null as Date | null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        
        // Récupérer les informations de l'utilisateur connecté
        const meResponse = await fetch("/api/auth/me")
        if (meResponse.ok) {
          const meData = await meResponse.json()
          setUserInfo(meData.user)
        }
        
        // Récupérer la liste des utilisateurs
        const response = await fetch("/api/users")
        if (!response.ok) {
          throw new Error("Impossible de récupérer la liste des utilisateurs")
        }
        
        const data = await response.json()
        setUsers(data.users || [])
      } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error)
        toast({
          title: "Erreur",
          description: "Impossible de récupérer la liste des utilisateurs",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUsers()
  }, [toast])

  // Déterminer le titre en fonction du rôle de l'utilisateur
  const getPageTitle = () => {
    if (userInfo?.role === "SUPER_ADMIN") {
      return "Utilisateurs de la plateforme"
    } else if (userInfo?.role === "ADMIN") {
      return `Utilisateurs de ${userInfo?.companyName || 'votre entreprise'}`
    }
    return "Utilisateurs"
  }
  
  // Déterminer le bouton d'ajout en fonction du rôle
  const renderAddButton = () => {
    if (userInfo?.role === "SUPER_ADMIN") {
      return (
        <Button asChild>
          <Link href="/dashboard/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un utilisateur
          </Link>
        </Button>
      )
    } else if (userInfo?.role === "ADMIN" && userInfo?.managedCompanyId) {
      return (
        <Button asChild>
          <Link href={`/dashboard/admin/companies/${userInfo.managedCompanyId}/users/invite`}>
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter un utilisateur
          </Link>
        </Button>
      )
    }
    return null
  }

  // Vérifier si l'utilisateur peut assigner des tâches (seulement ADMIN, pas SUPER_ADMIN)
  const canAssignTasks = () => {
    return userInfo?.role === "ADMIN";
  }

  // Ouvrir le modal d'assignation de tâche
  const openAssignTaskDialog = (userId: string, userName: string | null) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName || "l'utilisateur")
    setNewTask({
      title: "",
      description: "",
      priority: "3",
      energyLevel: "2",
      dueDate: null
    })
    setIsDialogOpen(true)
  }
  
  // Créer une tâche pour l'utilisateur sélectionné
  const createTask = async () => {
    if (!newTask.title || !selectedUserId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: parseInt(newTask.priority),
          energyLevel: parseInt(newTask.energyLevel),
          dueDate: newTask.dueDate,
          userId: selectedUserId
        })
      })
      
      if (!response.ok) {
        throw new Error("Erreur lors de la création de la tâche")
      }
      
      // Réinitialiser le formulaire
      setNewTask({
        title: "",
        description: "",
        priority: "3",
        energyLevel: "2",
        dueDate: null
      })
      
      // Fermer le modal
      setIsDialogOpen(false)
      
      toast({
        title: "Tâche assignée",
        description: `La tâche a été assignée à ${selectedUserName} avec succès`,
        variant: "default"
      })
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer la tâche",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminRequiredPage>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs{userInfo?.role === "ADMIN" ? " de votre entreprise" : " de la plateforme"}
          </p>
        </div>
        {renderAddButton()}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assigner une tâche à {selectedUserName}</DialogTitle>
            <DialogDescription>
              Créez une tâche et assignez-la à cet utilisateur
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre de la tâche *</Label>
              <Input
                id="title"
                placeholder="Titre de la tâche"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description de la tâche"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({...newTask, priority: value})}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Sélectionner une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">P0 - Quick Win</SelectItem>
                    <SelectItem value="1">P1 - Urgent</SelectItem>
                    <SelectItem value="2">P2 - Important</SelectItem>
                    <SelectItem value="3">P3 - À faire</SelectItem>
                    <SelectItem value="4">P4 - Optionnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="energy">Niveau d'énergie</Label>
                <Select
                  value={newTask.energyLevel}
                  onValueChange={(value) => setNewTask({...newTask, energyLevel: value})}
                >
                  <SelectTrigger id="energy">
                    <SelectValue placeholder="Niveau d'énergie requis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Extrême</SelectItem>
                    <SelectItem value="1">Élevé</SelectItem>
                    <SelectItem value="2">Moyen</SelectItem>
                    <SelectItem value="3">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !newTask.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newTask.dueDate ? (
                      format(newTask.dueDate, "PPP", { locale: fr })
                    ) : (
                      <span>Sélectionner une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newTask.dueDate || undefined}
                    onSelect={(date) => setNewTask({...newTask, dueDate: date || null})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={createTask} disabled={isSubmitting}>
              {isSubmitting ? "Assignation..." : "Assigner la tâche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            <CardTitle>Liste des utilisateurs</CardTitle>
          </div>
          <CardDescription>
            {users.length} utilisateur{users.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Aucun utilisateur</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Aucun utilisateur trouvé dans {userInfo?.role === "ADMIN" ? "votre entreprise" : "la plateforme"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  {userInfo?.role === "SUPER_ADMIN" && (
                    <TableHead>Entreprise</TableHead>
                  )}
                  <TableHead>Création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "Sans nom"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "SUPER_ADMIN" ? "default" : user.role === "ADMIN" ? "secondary" : "outline"}>
                        {user.role === "SUPER_ADMIN" 
                          ? "Super Admin" 
                          : user.role === "ADMIN" 
                            ? "Admin" 
                            : "Utilisateur"}
                      </Badge>
                    </TableCell>
                    {userInfo?.role === "SUPER_ADMIN" && (
                      <TableCell>{user.companyName || "-"}</TableCell>
                    )}
                    <TableCell>
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link href={`/dashboard/admin/users/${user.id}/edit`}>
                          Modifier
                        </Link>
                      </Button>
                      
                      {canAssignTasks() && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => openAssignTaskDialog(user.id, user.name)}
                        >
                          <ClipboardList className="mr-1 h-3 w-3" />
                          Tâche
                        </Button>
                      )}
                      
                      {userInfo?.role === "SUPER_ADMIN" && (
                        <Button 
                          variant="default" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/admin/view-as/${user.id}`}>
                            <Eye className="mr-1 h-3 w-3" />
                            Voir les données
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminRequiredPage>
  )
} 