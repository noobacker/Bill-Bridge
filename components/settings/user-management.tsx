"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash, Eye, EyeOff } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Sample users data
const sampleUsers = [
  { id: "1", name: "Admin User", email: "admin@bharatiya.com", role: "ADMIN", status: "Active" },
  { id: "2", name: "Production Manager", email: "manager@bharatiya.com", role: "SUPERVISOR", status: "Active" },
]

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const SECTION_OPTIONS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "raw-materials", label: "Raw Materials" },
    { id: "production", label: "Production" },
    { id: "inventory", label: "Production Inventory" },
    { id: "sales", label: "Sales" },
    { id: "expenses", label: "Expenses" },
    { id: "reports", label: "Reports" },
    { id: "partners", label: "Partners" },
    { id: "settings", label: "Settings" },
  ] as const

  const allSectionIds = SECTION_OPTIONS.map((s) => s.id)

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    role: "SUPERVISOR",
    password: "",
    allowedSections: allSectionIds as string[],
  })
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({})
  const [plainPasswords, setPlainPasswords] = useState<{ [id: string]: string }>({})
  const [loading, setLoading] = useState(true)

  // Fetch users from backend
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers(data)

      // After users are loaded, hydrate plainPasswords from localStorage
      try {
        const restored: { [id: string]: string } = {}
        data.forEach((user: any) => {
          const key = `user_password_${user.id}`
          const stored = window.localStorage.getItem(key)
          if (stored) {
            restored[user.id] = stored
          }
        })
        if (Object.keys(restored).length > 0) {
          setPlainPasswords(restored)
        }
      } catch {
        // localStorage may be unavailable; ignore
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchUsers() }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
      // For supervisors, default to all sections; for admins sections are ignored in UI
      allowedSections: value === "SUPERVISOR" ? allSectionIds : allSectionIds,
    }))
  }
  const openAddDialog = () => {
    setIsEditing(false)
    setSelectedUser(null)
    setFormData({ name: "", username: "", role: "SUPERVISOR", password: "", allowedSections: allSectionIds })
  }
  const openEditDialog = (user: any) => {
    setIsEditing(true)
    setSelectedUser(user)
    setFormData({
      name: user.name,
      username: user.username,
      role: user.role,
      password: "",
      allowedSections: user.allowedSections && user.allowedSections.length > 0 ? user.allowedSections : allSectionIds,
    })
    setIsDialogOpen(true)
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" })
      return
    }
    if (!formData.username.trim()) {
      toast({ title: "Error", description: "Username is required.", variant: "destructive" })
      return
    }
    if (!isEditing && !formData.password.trim()) {
      toast({ title: "Error", description: "Password is required for new users.", variant: "destructive" })
      return
    }
    
    setIsLoading(true)
    try {
      const url = isEditing && selectedUser ? "/api/user" : "/api/user"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing
        ? { 
            id: selectedUser.id, 
            name: formData.name.trim(), 
            username: formData.username.trim(), 
            role: formData.role, 
            allowedSections: formData.role === "SUPERVISOR" ? formData.allowedSections : allSectionIds,
            ...(formData.password.trim() ? { password: formData.password.trim() } : {}), 
          }
        : { 
            name: formData.name.trim(), 
            username: formData.username.trim(), 
            role: formData.role, 
            password: formData.password.trim(),
            allowedSections: formData.role === "SUPERVISOR" ? formData.allowedSections : allSectionIds,
          }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }
      const user = await res.json()
      toast({ title: "Success", description: `User ${isEditing ? "updated" : "created"} successfully.` })
      setIsDialogOpen(false)
      setIsEditing(false)
      setSelectedUser(null)
      setFormData({ name: "", username: "", role: "SUPERVISOR", password: "", allowedSections: allSectionIds })
      fetchUsers()
      // Store plain password for this user (only if just set), in state and localStorage
      if (formData.password.trim()) {
        const plain = formData.password.trim()
        setPlainPasswords((prev) => ({ ...prev, [user.id]: plain }))
        try {
          const key = `user_password_${user.id}`
          window.localStorage.setItem(key, plain)
        } catch {
          // ignore storage errors
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || `Failed to ${isEditing ? "update" : "create"} user.`, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }
  const handleDelete = async (user: any) => {
    if (!window.confirm(`Delete user '${user.name}'?`)) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Deleted", description: "User deleted successfully." })
      fetchUsers()
    } catch {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getPasswordDisplay = (user: any) => {
    if (plainPasswords[user.id]) {
      return visiblePasswords[user.id] ? plainPasswords[user.id] : "•••••••"
    }
    return "•••••••"
  }

  const canTogglePassword = (user: any) => {
    return !!plainPasswords[user.id]
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their permissions.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
                  <DialogDescription>{isEditing ? "Update user details." : "Create a new user account for the system."}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select onValueChange={handleRoleChange} value={formData.role} defaultValue="SUPERVISOR">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.role === "SUPERVISOR" && (
                      <div className="space-y-2">
                        <Label>Allowed Sections</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {SECTION_OPTIONS.map((section) => {
                            const checked = formData.allowedSections.includes(section.id)
                            return (
                              <label key={section.id} className="flex items-center space-x-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked
                                    setFormData((prev) => ({
                                      ...prev,
                                      allowedSections: isChecked
                                        ? Array.from(new Set([...prev.allowedSections, section.id]))
                                        : prev.allowedSections.filter((id) => id !== section.id),
                                    }))
                                  }}
                                />
                                <span>{section.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="password">{isEditing ? "New Password (leave blank to keep current)" : "Password"}</Label>
                      <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required={!isEditing} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update User" : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Password</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton rows while loading
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-16 animate-pulse" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 bg-muted rounded w-16 animate-pulse ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6}>No users found.</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <span>{getPasswordDisplay(user)}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => togglePasswordVisibility(user.id)}
                              >
                                {visiblePasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {canTogglePassword(user)
                                ? "Show/Hide password (stored locally on this browser)"
                                : "Password is hidden. Set or update it to make it viewable here."}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user)}>
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
