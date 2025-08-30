import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Star, Zap, CreditCard, Calendar } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import { useSubscription } from "@/hooks/use-subscription";

const SubscriptionPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { subscribed, subscription_tier, subscription_end, loading: subLoading, checkSubscription } = useSubscription(user);

  const monthlyPrice = 8.90;
  const annualPrice = 74.90;
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - annualPrice;
  const savingsPercentage = Math.round((savings / monthlyTotal) * 100);

  const features = [
    "Histórico ilimitado de cálculos",
    "Relatórios detalhados",
    "Análise de tendências",
    "Exportação de dados",
    "Suporte prioritário",
    "Sem anúncios"
  ];

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePlanSelection = async (plan: 'monthly' | 'annual') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      // Open Stripe customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro ao acessar gerenciamento",
        description: error.message || "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Você precisa estar logado para acessar os planos de assinatura.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/auth')}>
                Fazer Login
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Planos e Assinatura</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={checkSubscription} 
            disabled={subLoading}
          >
            {subLoading ? 'Verificando...' : 'Atualizar Status'}
          </Button>
        </div>

        {/* Status da Assinatura Atual */}
        {subscribed && (
          <Card className="mb-6 border-2 border-success/20 bg-success/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success" />
                  Plano Ativo
                </CardTitle>
                <Badge variant="secondary" className="bg-success/10 text-success">
                  {subscription_tier || 'PRO'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status da Assinatura</p>
                  <p className="font-semibold text-success">Ativa</p>
                  {subscription_end && (
                    <>
                      <p className="text-sm text-muted-foreground">Próxima cobrança</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(subscription_end)}
                      </p>
                    </>
                  )}
                </div>
                <Button 
                  onClick={handleManageSubscription}
                  disabled={loading === 'manage'}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  {loading === 'manage' ? 'Carregando...' : 'Gerenciar Assinatura'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Planos Disponíveis */}
        {!subscribed && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Escolha o Melhor Plano Para Você
            </h2>
            <p className="text-muted-foreground">
              Desbloqueie todo o potencial da calculadora com recursos avançados
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Plano Mensal */}
          <Card className={`relative border-2 transition-all ${subscribed && subscription_tier === 'Mensal' ? 'border-success/50 bg-success/5' : 'border-border hover:border-primary/50'}`}>
            {subscribed && subscription_tier === 'Mensal' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-success text-success-foreground">Plano Atual</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Plano Mensal</CardTitle>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  R$ {monthlyPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-muted-foreground">por mês</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={subscribed && subscription_tier === 'Mensal' ? 'secondary' : 'outline'}
                onClick={() => handlePlanSelection('monthly')}
                disabled={loading === 'monthly' || (subscribed && subscription_tier === 'Mensal')}
              >
                {loading === 'monthly' ? 'Processando...' : 
                 subscribed && subscription_tier === 'Mensal' ? 'Plano Atual' : 'Escolher Mensal'}
              </Button>
            </CardContent>
          </Card>

          {/* Plano Anual */}
          <Card className={`relative border-2 transition-all ${subscribed && subscription_tier === 'Anual' ? 'border-success/50 bg-success/5 shadow-[var(--shadow-elevated)]' : 'border-primary shadow-[var(--shadow-elevated)]'}`}>
            {subscribed && subscription_tier === 'Anual' ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-success text-success-foreground">Plano Atual</Badge>
              </div>
            ) : (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Mais Popular
                </div>
              </div>
            )}
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">Plano Anual</CardTitle>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-primary">
                  R$ {annualPrice.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-sm text-muted-foreground">por ano</div>
                <div className="text-xs text-success font-semibold">
                  Economize R$ {savings.toFixed(2).replace('.', ',')} ({savingsPercentage}%)
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full ${subscribed && subscription_tier === 'Anual' ? 'bg-success hover:bg-success/90' : 'bg-gradient-to-r from-primary to-accent hover:opacity-90'}`}
                onClick={() => handlePlanSelection('annual')}
                disabled={loading === 'annual' || (subscribed && subscription_tier === 'Anual')}
              >
                {loading === 'annual' ? 'Processando...' : 
                 subscribed && subscription_tier === 'Anual' ? 'Plano Atual' : 'Escolher Anual'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode cancelar sua assinatura a qualquer momento através do gerenciamento de assinatura.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">O que acontece após o cancelamento?</h4>
              <p className="text-sm text-muted-foreground">
                Você continuará tendo acesso aos recursos PRO até o final do período já pago.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Posso trocar de plano?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionPage;