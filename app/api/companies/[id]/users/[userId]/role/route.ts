import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { isUserAdmin } from "@/lib/admin-utils"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const companyId = params.id
    const userId = params.userId

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Identifiants manquants" },
        { status: 400 }
      )
    }

    // Récupérer le body de la requête
    const body = await request.json()
    const { isAdmin } = body

    if (isAdmin === undefined) {
      return NextResponse.json(
        { error: "Le statut d'administrateur est requis" },
        { status: 400 }
      )
    }

    // Vérifier l'authentification
    const currentUser = await getAuthUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour accéder à cette ressource" },
        { status: 401 }
      )
    }

    // Vérifier les droits d'administrateur global
    const isSuperAdmin = await isUserAdmin(currentUser.id, true)
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Vous n'avez pas les droits pour modifier les rôles d'entreprise" },
        { status: 403 }
      )
    }

    // Vérifier que l'entreprise existe
    const company = await prisma.$queryRaw`
      SELECT id, name FROM "Company" WHERE id = ${companyId}::uuid
    `
    if (!Array.isArray(company) || company.length === 0) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.$queryRaw`
      SELECT id, email FROM "User" WHERE id = ${userId}::uuid
    `
    if (!Array.isArray(user) || user.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur appartient à l'entreprise
    const userCompany = await prisma.$queryRaw`
      SELECT * FROM "UserCompany" 
      WHERE "userId" = ${userId}::uuid AND "companyId" = ${companyId}::uuid
    `
    if (!Array.isArray(userCompany) || userCompany.length === 0) {
      return NextResponse.json(
        { error: "L'utilisateur n'est pas membre de cette entreprise" },
        { status: 404 }
      )
    }

    // Mettre à jour le rôle de l'utilisateur
    if (isAdmin) {
      // Si on le rend admin, on l'ajoute comme administrateur de l'entreprise
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "managedCompanyId" = ${companyId}::uuid, "updatedAt" = NOW()
        WHERE id = ${userId}::uuid
      `
    } else {
      // Si on lui retire le rôle d'admin, on enlève sa relation d'administrateur
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "managedCompanyId" = NULL, "updatedAt" = NOW()
        WHERE id = ${userId}::uuid AND "managedCompanyId" = ${companyId}::uuid
      `
    }

    return NextResponse.json({ 
      success: true,
      message: `L'utilisateur est maintenant ${isAdmin ? 'administrateur' : 'membre standard'} de l'entreprise` 
    })
    
  } catch (error) {
    console.error("Erreur lors de la modification du rôle de l'utilisateur:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la modification du rôle de l'utilisateur" },
      { status: 500 }
    )
  }
} 