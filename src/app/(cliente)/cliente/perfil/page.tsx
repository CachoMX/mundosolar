'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Phone, MapPin, Loader2, Lock, Eye, EyeOff, Calendar, ArrowLeft, Camera, Trash2 } from 'lucide-react'

interface ClientProfile {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt: string
  profileImage: string | null
}

export default function PerfilPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile image state
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageSuccess, setImageSuccess] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('')
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/auth/client-session')
      const result = await response.json()

      if (result.success) {
        setProfile(result.client)
      } else {
        setError(result.error || 'Error al cargar perfil')
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError('')
    setImageSuccess('')
    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/auth/client-profile-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setImageError(result.error || 'Error al subir imagen')
        return
      }

      // Update profile with new image URL
      if (profile) {
        setProfile({ ...profile, profileImage: result.imageUrl })
      }
      setImageSuccess('Imagen actualizada correctamente')

      // Clear success message after 3 seconds
      setTimeout(() => setImageSuccess(''), 3000)
    } catch (err) {
      console.error('Error uploading image:', err)
      setImageError('Error al subir imagen')
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async () => {
    if (!profile?.profileImage) return

    setImageError('')
    setImageSuccess('')
    setUploadingImage(true)

    try {
      const response = await fetch('/api/auth/client-profile-image', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        setImageError(result.error || 'Error al eliminar imagen')
        return
      }

      // Update profile to remove image
      if (profile) {
        setProfile({ ...profile, profileImage: null })
      }
      setImageSuccess('Imagen eliminada correctamente')

      // Clear success message after 3 seconds
      setTimeout(() => setImageSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting image:', err)
      setImageError('Error al eliminar imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccessMessage('')
    setPasswordErrorMessage('')

    // Validations
    if (!currentPassword) {
      setPasswordErrorMessage('La contraseña actual es requerida')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMessage('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Las contraseñas no coinciden')
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch('/api/auth/client-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const result = await response.json()

      if (result.success) {
        setPasswordSuccessMessage('Contraseña actualizada correctamente')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordErrorMessage(result.error || 'Error al cambiar contraseña')
      }
    } catch (err) {
      console.error('Error changing password:', err)
      setPasswordErrorMessage('Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Error al cargar perfil'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userInitials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'

  const createdAt = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A'

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">Administra tu información personal y configuración de cuenta</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Header Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Usuario</CardTitle>
            <CardDescription>
              Tu información básica de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profileImage || ''} alt={`${profile.firstName} ${profile.lastName}`} />
                  <AvatarFallback className="text-2xl">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{profile.firstName} {profile.lastName}</h3>
                <p className="text-gray-600">{profile.email || 'Sin correo registrado'}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Cliente desde {createdAt}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Cambiar foto
                  </Button>
                  {profile.profileImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteImage}
                      disabled={uploadingImage}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {imageError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {imageError}
              </div>
            )}
            {imageSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {imageSuccess}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Formatos permitidos: JPG, PNG, WEBP, GIF. Tamaño máximo: 5MB.
            </p>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Tu información de contacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 py-3 border-b">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Nombre completo</p>
                  <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 py-3 border-b">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Correo electrónico</p>
                  <p className="font-medium">{profile.email || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 py-3 border-b">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{profile.phone || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 py-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{profile.address || 'No registrada'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Actualiza tu contraseña de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-6">
              {passwordSuccessMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {passwordSuccessMessage}
                </div>
              )}

              {passwordErrorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {passwordErrorMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={changingPassword}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={changingPassword}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={changingPassword}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Cambiar Contraseña
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Cuenta</CardTitle>
            <CardDescription>
              Detalles de tu cuenta en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">ID de Cliente</span>
                <span className="font-mono text-sm">{profile.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Estado de la cuenta</span>
                <span className="text-green-600 font-medium">Activa</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tipo de cuenta</span>
                <span className="font-medium">Cliente</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
