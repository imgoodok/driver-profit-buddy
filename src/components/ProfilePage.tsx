import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, HelpCircle, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User as UserType } from "@supabase/supabase-js";
import { useTheme } from "@/hooks/use-theme";

const ProfilePage = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Buscar perfil do usuário
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setProfile(profileData);
        setDisplayName(profileData?.display_name || "");
      }
      setLoading(false);
    };

    getUser();
  }, []);

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    }
  };

  const handleEmailChange = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de alteração de e-mail será implementada em breve",
    });
  };

  const handleSupport = () => {
    toast({
      title: "Suporte",
      description: "Entre em contato através do nosso WhatsApp: (11) 99999-9999",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Perfil</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="user-id">ID do Usuário</Label>
                <Input
                  id="user-id"
                  value={user.id}
                  readOnly
                  className="bg-muted"
                />
              </div>
              
              <div>
                <Label htmlFor="email">E-mail</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    value={user.email || ""}
                    readOnly
                    className="bg-muted"
                  />
                  <Button variant="outline" onClick={handleEmailChange}>
                    <Mail className="w-4 h-4 mr-2" />
                    Alterar
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="display-name">Nome de Exibição</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Digite seu nome"
                />
              </div>

              <Button onClick={updateProfile} className="w-full">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* Suporte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Suporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSupport} variant="outline" className="w-full">
                <HelpCircle className="w-4 h-4 mr-2" />
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;