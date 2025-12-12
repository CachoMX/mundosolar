'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, User, Mail, Calendar, Save, ArrowLeft, Lock, Eye, EyeOff, Camera, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

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

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('')
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('')
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('')
  const [emailErrorMessage, setEmailErrorMessage] = useState('')

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error) throw error
      if (!authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)
      setEmail(authUser.email || '')
      setName(authUser.user_metadata?.name || '')
      setPhone(authUser.user_metadata?.phone || '')
      setAvatarUrl(authUser.user_metadata?.avatar_url || null)
    } catch (error) {
      console.error('Error loading profile:', error)
      setErrorMessage('Error al cargar el perfil')
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

      const response = await fetch('/api/auth/profile-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setImageError(result.error || 'Error al subir imagen')
        return
      }

      setAvatarUrl(result.imageUrl)
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
    if (!avatarUrl) return

    setImageError('')
    setImageSuccess('')
    setUploadingImage(true)

    try {
      const response = await fetch('/api/auth/profile-image', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        setImageError(result.error || 'Error al eliminar imagen')
        return
      }

      setAvatarUrl(null)
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          phone,
        }
      })

      if (error) throw error

      setSuccessMessage('Perfil actualizado correctamente')

      // Reload user data
      await loadUserProfile()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setErrorMessage(error.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setPasswordSuccessMessage('')
    setPasswordErrorMessage('')

    // Validations
    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMessage('La nueva contraseña debe tener al menos 6 caracteres')
      setChangingPassword(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Las contraseñas no coinciden')
      setChangingPassword(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordSuccessMessage('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordErrorMessage(error.message || 'Error al cambiar la contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingEmail(true)
    setEmailSuccessMessage('')
    setEmailErrorMessage('')

    if (!newEmail || !newEmail.includes('@')) {
      setEmailErrorMessage('Por favor ingresa un correo electrónico válido')
      setChangingEmail(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (error) throw error

      setEmailSuccessMessage('Se ha enviado un correo de confirmación a ' + newEmail + '. Por favor verifica tu bandeja de entrada.')
      setNewEmail('')
    } catch (error: any) {
      console.error('Error changing email:', error)
      setEmailErrorMessage(error.message || 'Error al cambiar el correo electrónico')
    } finally {
      setChangingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const userInitials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || email?.charAt(0).toUpperCase() || 'U'

  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('es-MX', {
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
                  <AvatarImage src={avatarUrl || ''} alt={name || email} />
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
                <h3 className="text-xl font-semibold">{name || 'Usuario'}</h3>
                <p className="text-gray-600">{email}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Miembro desde {createdAt}
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
                  {avatarUrl && (
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

        {/* Edit Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="pl-10 bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El correo electrónico no puede ser modificado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(55) 1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
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

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Correo Electrónico</CardTitle>
            <CardDescription>
              Actualiza tu correo electrónico de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-6">
              {emailSuccessMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {emailSuccessMessage}
                </div>
              )}

              {emailErrorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {emailErrorMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentEmail">Correo Actual</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="currentEmail"
                    type="email"
                    value={email}
                    disabled
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">Nuevo Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="nuevo@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="pl-10"
                    disabled={changingEmail}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Recibirás un correo de confirmación en tu nueva dirección
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changingEmail}
                >
                  {changingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Cambiar Email
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
                <span className="text-gray-600">ID de Usuario</span>
                <span className="font-mono text-sm">{user?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Estado de la cuenta</span>
                <span className="text-green-600 font-medium">Activa</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Último inicio de sesión</span>
                <span className="text-sm">
                  {user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString('es-MX')
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
