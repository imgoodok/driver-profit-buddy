import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, DollarSign, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useTheme } from "@/hooks/use-theme";

interface Calculation {
  id: string;
  date: string;
  total_earnings: number;
  km_driven: number;
  fuel_cost: number;
  net_profit: number;
}

interface AdditionalExpense {
  id: string;
  date: string;
  total_cost: number;
  maintenance_cost: number;
  food_cost: number;
  toll_cost: number;
  parking_cost: number;
}

const ChartsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'3' | '6' | '12'>('3');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        fetchData();
      }
    };
    getUser();
  }, []);

  const fetchData = async () => {
    try {
      const monthsAgo = parseInt(periodFilter);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);

      const [calcResult, expenseResult] = await Promise.all([
        supabase
          .from('calculations')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true }),
        supabase
          .from('additional_expenses')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true })
      ]);

      if (calcResult.error) throw calcResult.error;
      if (expenseResult.error) throw expenseResult.error;

      setCalculations(calcResult.data || []);
      setAdditionalExpenses(expenseResult.data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [periodFilter, user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Preparar dados para gráficos
  const getMonthlyData = () => {
    const monthlyData: { [key: string]: any } = {};

    calculations.forEach(calc => {
      const monthKey = calc.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          earnings: 0,
          expenses: 0,
          profit: 0,
          km: 0,
          days: 0
        };
      }
      monthlyData[monthKey].earnings += calc.total_earnings;
      monthlyData[monthKey].profit += calc.net_profit;
      monthlyData[monthKey].km += calc.km_driven;
      monthlyData[monthKey].days += 1;
    });

    additionalExpenses.forEach(exp => {
      const monthKey = exp.date.substring(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += exp.total_cost;
        monthlyData[monthKey].profit -= exp.total_cost;
      }
    });

    return Object.values(monthlyData).map((data: any) => ({
      ...data,
      avgPerDay: data.days > 0 ? data.profit / data.days : 0,
      month: new Date(data.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    }));
  };

  const getExpenseBreakdown = () => {
    const breakdown = {
      maintenance: 0,
      food: 0,
      toll: 0,
      parking: 0
    };

    additionalExpenses.forEach(exp => {
      breakdown.maintenance += exp.maintenance_cost;
      breakdown.food += exp.food_cost;
      breakdown.toll += exp.toll_cost;
      breakdown.parking += exp.parking_cost;
    });

    return [
      { name: 'Manutenção', value: breakdown.maintenance, color: '#ef4444' },
      { name: 'Alimentação', value: breakdown.food, color: '#f97316' },
      { name: 'Pedágio', value: breakdown.toll, color: '#eab308' },
      { name: 'Estacionamento', value: breakdown.parking, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
  };

  const getOverallStats = () => {
    const totalEarnings = calculations.reduce((sum, calc) => sum + calc.total_earnings, 0);
    const totalExpenses = additionalExpenses.reduce((sum, exp) => sum + exp.total_cost, 0);
    const totalProfit = calculations.reduce((sum, calc) => sum + calc.net_profit, 0) - totalExpenses;
    const totalKm = calculations.reduce((sum, calc) => sum + calc.km_driven, 0);
    const workingDays = calculations.length;

    const avgDailyEarnings = workingDays > 0 ? totalEarnings / workingDays : 0;
    const avgDailyProfit = workingDays > 0 ? totalProfit / workingDays : 0;
    const avgKmPerDay = workingDays > 0 ? totalKm / workingDays : 0;

    return {
      totalEarnings,
      totalExpenses,
      totalProfit,
      totalKm,
      workingDays,
      avgDailyEarnings,
      avgDailyProfit,
      avgKmPerDay
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  const monthlyData = getMonthlyData();
  const expenseBreakdown = getExpenseBreakdown();
  const stats = getOverallStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/history')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Histórico
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Análise e Gráficos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Período:</label>
            <Select value={periodFilter} onValueChange={(value: '3' | '6' | '12') => setPeriodFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                Total Faturado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalEarnings)}</p>
              <p className="text-sm text-muted-foreground">
                Média diária: {formatCurrency(stats.avgDailyEarnings)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Total Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalExpenses)}</p>
              <p className="text-sm text-muted-foreground">
                {stats.workingDays} dias trabalhados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Lucro Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(stats.totalProfit)}
              </p>
              <p className="text-sm text-muted-foreground">
                Média diária: {formatCurrency(stats.avgDailyProfit)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total KM</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{stats.totalKm.toFixed(0)} km</p>
              <p className="text-sm text-muted-foreground">
                Média diária: {stats.avgKmPerDay.toFixed(0)} km
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolução Mensal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                <Legend />
                <Line type="monotone" dataKey="earnings" stroke="#10b981" name="Faturamento" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Lucro Líquido" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras - KM por Mês */}
          <Card>
            <CardHeader>
              <CardTitle>Quilometragem Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value} km`, 'KM Rodados']} />
                  <Bar dataKey="km" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Distribuição de Gastos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Gastos Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum gasto adicional no período
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;