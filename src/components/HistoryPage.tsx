import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Calculator, ArrowLeft, Crown, Moon, Sun, BarChart3, FileText, User as UserIcon, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Session } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription } from "@/hooks/use-subscription";
import { useTheme } from "@/hooks/use-theme";

interface Calculation {
  id: string;
  date: string;
  total_earnings: number;
  km_driven: number;
  km_per_liter: number;
  fuel_price: number;
  fuel_liters: number;
  fuel_cost: number;
  net_profit: number;
  maintenance_cost?: number;
  food_cost?: number;
  toll_cost?: number;
  parking_cost?: number;
}

interface AdditionalExpense {
  id: string;
  date: string;
  maintenance_cost: number;
  food_cost: number;
  toll_cost: number;
  parking_cost: number;
  total_cost: number;
}

const HistoryPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [filteredCalculations, setFilteredCalculations] = useState<Calculation[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<AdditionalExpense[]>([]);
  const [selectedCalcIds, setSelectedCalcIds] = useState<Set<string>>(new Set());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [countFilter, setCountFilter] = useState<'all' | '7' | '15' | '30' | '50'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '15' | '30'>('all');
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [editFormData, setEditFormData] = useState({
    total_earnings: "",
    km_driven: "",
    km_per_liter: "",
    fuel_price: "",
  });
  const [editingExpense, setEditingExpense] = useState<AdditionalExpense | null>(null);
  const [editExpenseFormData, setEditExpenseFormData] = useState({
    maintenance_cost: "",
    food_cost: "",
    toll_cost: "",
    parking_cost: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const { subscribed, subscription_tier } = useSubscription(user);
  const { theme, toggleTheme } = useTheme();

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

  useEffect(() => {
    if (user) {
      fetchCalculations();
      fetchAdditionalExpenses();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [calculations, additionalExpenses, countFilter, dateFilter]);

  const fetchCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('additional_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdditionalExpenses(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os gastos adicionais",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    let filteredCalcs = [...calculations];
    let filteredExps = [...additionalExpenses];

    // Apply date filter
    if (dateFilter !== 'all') {
      const daysAgo = parseInt(dateFilter);
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - daysAgo);
      
      filteredCalcs = filteredCalcs.filter(calc => {
        const calcDate = new Date(calc.date);
        return calcDate >= dateLimit;
      });
      
      filteredExps = filteredExps.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateLimit;
      });
    }

    // Apply count filter
    if (countFilter !== 'all') {
      const count = parseInt(countFilter);
      filteredCalcs = filteredCalcs.slice(0, count);
      filteredExps = filteredExps.slice(0, count);
    }

    setFilteredCalculations(filteredCalcs);
    setFilteredExpenses(filteredExps);
  };

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCalculations(prev => prev.filter(calc => calc.id !== id));
      setSelectedCalcIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      toast({
        title: "Sucesso",
        description: "Cálculo excluído com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cálculo",
        variant: "destructive",
      });
    }
  };

  const updateCalculation = async () => {
    if (!editingCalc) return;

    try {
      const totalEarnings = parseFloat(editFormData.total_earnings);
      const kmDriven = parseFloat(editFormData.km_driven);
      const kmPerLiter = parseFloat(editFormData.km_per_liter);
      const fuelPrice = parseFloat(editFormData.fuel_price);

      const fuelLiters = kmDriven / kmPerLiter;
      const fuelCost = fuelLiters * fuelPrice;
      const netProfit = totalEarnings - fuelCost;

      const { error } = await supabase
        .from('calculations')
        .update({
          total_earnings: totalEarnings,
          km_driven: kmDriven,
          km_per_liter: kmPerLiter,
          fuel_price: fuelPrice,
          fuel_liters: fuelLiters,
          fuel_cost: fuelCost,
          net_profit: netProfit,
        })
        .eq('id', editingCalc.id);

      if (error) throw error;

      await fetchCalculations();
      setEditingCalc(null);
      
      toast({
        title: "Sucesso",
        description: "Cálculo atualizado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cálculo",
        variant: "destructive",
      });
    }
  };

  const toggleCalcSelection = (id: string) => {
    setSelectedCalcIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllCalculations = () => {
    if (selectedCalcIds.size === filteredCalculations.length) {
      setSelectedCalcIds(new Set());
    } else {
      setSelectedCalcIds(new Set(filteredCalculations.map(calc => calc.id)));
    }
  };

  const selectAllExpenses = () => {
    if (selectedExpenseIds.size === filteredExpenses.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(filteredExpenses.map(exp => exp.id)));
    }
  };

  const deleteSelected = async () => {
    try {
      // Deletar cálculos selecionados
      if (selectedCalcIds.size > 0) {
        const { error: calcError } = await supabase
          .from('calculations')
          .delete()
          .in('id', Array.from(selectedCalcIds));
        
        if (calcError) throw calcError;
      }

      // Deletar gastos selecionados
      if (selectedExpenseIds.size > 0) {
        const { error: expError } = await supabase
          .from('additional_expenses')
          .delete()
          .in('id', Array.from(selectedExpenseIds));
        
        if (expError) throw expError;
      }

      // Atualizar listas locais
      setCalculations(prev => prev.filter(calc => !selectedCalcIds.has(calc.id)));
      setAdditionalExpenses(prev => prev.filter(exp => !selectedExpenseIds.has(exp.id)));
      
      // Limpar seleções
      setSelectedCalcIds(new Set());
      setSelectedExpenseIds(new Set());
      
      toast({
        title: "Sucesso",
        description: `${selectedCalcIds.size + selectedExpenseIds.size} itens excluídos com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir os itens selecionados",
        variant: "destructive",
      });
    }
  };

  const generatePDF = () => {
    const selectedCalcs = filteredCalculations.filter(calc => selectedCalcIds.has(calc.id));
    const selectedExpenses = filteredExpenses.filter(exp => selectedExpenseIds.has(exp.id));
    
    if (selectedCalcs.length === 0 && selectedExpenses.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um item para gerar o PDF",
        variant: "destructive",
      });
      return;
    }

    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    let yPosition = 20;
    
    // Título
    pdf.setFontSize(20);
    pdf.text('Relatório de Ganhos - Uber', 20, yPosition);
    yPosition += 15;
    
    // Data de geração
    pdf.setFontSize(12);
    pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, yPosition);
    yPosition += 10;
    
    // Período filtrado
    if (dateFilter !== 'all') {
      pdf.text(`Período: Últimos ${dateFilter} dias`, 20, yPosition);
      yPosition += 15;
    } else {
      yPosition += 10;
    }
    
    // Resumo
    const totals = getSelectedTotals();
    pdf.setFontSize(14);
    pdf.text('RESUMO GERAL', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.text(`Total Faturado: R$ ${totals.totalEarnings.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Total Combustível: R$ ${totals.fuelCost.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Gastos Adicionais: R$ ${totals.totalExpenses.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Lucro Líquido: R$ ${totals.finalNetProfit.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Total KM: ${totals.totalKm} km`, 20, yPosition);
    yPosition += 15;
    
    // Cálculos Diários
    if (selectedCalcs.length > 0) {
      pdf.setFontSize(14);
      pdf.text('CÁLCULOS DIÁRIOS', 20, yPosition);
      yPosition += 10;
      
      selectedCalcs.forEach((calc) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(10);
        pdf.text(`Data: ${formatDate(calc.date)}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Faturamento: R$ ${calc.total_earnings.toFixed(2)} | KM: ${calc.km_driven} | Combustível: R$ ${calc.fuel_cost.toFixed(2)} | Lucro: R$ ${calc.net_profit.toFixed(2)}`, 20, yPosition);
        yPosition += 8;
      });
      yPosition += 5;
    }
    
    // Gastos Adicionais
    if (selectedExpenses.length > 0) {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.text('GASTOS ADICIONAIS', 20, yPosition);
      yPosition += 10;
      
      selectedExpenses.forEach((exp) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(10);
        pdf.text(`Data: ${formatDate(exp.date)}`, 20, yPosition);
        yPosition += 6;
        
        const expenses = [];
        if (exp.maintenance_cost > 0) expenses.push(`Manutenção: R$ ${exp.maintenance_cost.toFixed(2)}`);
        if (exp.food_cost > 0) expenses.push(`Alimentação: R$ ${exp.food_cost.toFixed(2)}`);
        if (exp.toll_cost > 0) expenses.push(`Pedágio: R$ ${exp.toll_cost.toFixed(2)}`);
        if (exp.parking_cost > 0) expenses.push(`Estacionamento: R$ ${exp.parking_cost.toFixed(2)}`);
        
        pdf.text(expenses.join(' | '), 20, yPosition);
        yPosition += 6;
        pdf.text(`Total: R$ ${exp.total_cost.toFixed(2)}`, 20, yPosition);
        yPosition += 8;
      });
    }
    
    // Salvar PDF
    const fileName = `relatorio-uber-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    toast({
      title: "Sucesso",
      description: `PDF gerado: ${fileName}`,
    });
  };

  const getSelectedTotals = () => {
    const selectedCalcs = filteredCalculations.filter(calc => selectedCalcIds.has(calc.id));
    const selectedExpenses = filteredExpenses.filter(exp => selectedExpenseIds.has(exp.id));
    
    const calcTotals = selectedCalcs.reduce(
      (acc, calc) => ({
        totalEarnings: acc.totalEarnings + calc.total_earnings,
        fuelCost: acc.fuelCost + calc.fuel_cost,
        netProfit: acc.netProfit + calc.net_profit,
        totalKm: acc.totalKm + calc.km_driven,
        days: acc.days + 1,
      }),
      { totalEarnings: 0, fuelCost: 0, netProfit: 0, totalKm: 0, days: 0 }
    );

    const expenseTotals = selectedExpenses.reduce(
      (acc, exp) => ({
        totalExpenses: acc.totalExpenses + exp.total_cost,
        expenseCount: acc.expenseCount + 1,
      }),
      { totalExpenses: 0, expenseCount: 0 }
    );

    return {
      ...calcTotals,
      ...expenseTotals,
      finalNetProfit: calcTotals.netProfit - expenseTotals.totalExpenses
    };
  };

  const deleteAdditionalExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('additional_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAdditionalExpenses(prev => prev.filter(exp => exp.id !== id));
      setSelectedExpenseIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      toast({
        title: "Sucesso",
        description: "Gasto adicional excluído com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o gasto adicional",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (calculation: Calculation) => {
    setEditingCalc(calculation);
    setEditFormData({
      total_earnings: calculation.total_earnings.toString(),
      km_driven: calculation.km_driven.toString(),
      km_per_liter: calculation.km_per_liter.toString(),
      fuel_price: calculation.fuel_price.toString(),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando histórico...</div>
      </div>
    );
  }

  const selectedTotals = getSelectedTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-6xl mx-auto">
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
            <h1 className="text-3xl font-bold">Histórico de Cálculos</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user && (
              <Button variant="outline" onClick={() => navigate('/profile')}>
                <UserIcon className="w-4 h-4 mr-2" />
                Perfil
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/charts')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráficos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => generatePDF()}
              disabled={selectedCalcIds.size === 0 && selectedExpenseIds.size === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
            {user && !subscribed && (
              <Button variant="default" onClick={() => navigate('/subscription')}>
                <Crown className="w-4 h-4 mr-2" />
                Assinar PRO
              </Button>
            )}
            {user && subscribed && (
              <Button variant="outline" onClick={() => navigate('/subscription')}>
                <Crown className="w-4 h-4 mr-2" />
                {subscription_tier || 'PRO'}
              </Button>
            )}
            <Button onClick={() => navigate('/')}>
              <Calculator className="w-4 h-4 mr-2" />
              Nova Calculação
            </Button>
          </div>
        </div>

        {/* Botões de ação selecionados */}
        {(selectedCalcIds.size > 0 || selectedExpenseIds.size > 0) && (
          <div className="fixed bottom-4 right-4 z-50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="lg" className="shadow-lg">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Selecionados ({selectedCalcIds.size + selectedExpenseIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Confirmar Exclusão
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Você está prestes a excluir:
                    <ul className="mt-2 list-disc list-inside">
                      {selectedCalcIds.size > 0 && <li>{selectedCalcIds.size} cálculo(s) diário(s)</li>}
                      {selectedExpenseIds.size > 0 && <li>{selectedExpenseIds.size} gasto(s) adicional(is)</li>}
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteSelected} className="bg-destructive hover:bg-destructive/90">
                    Excluir Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Resumo dos selecionados */}
        <Card className="mb-6 border-2 border-dashed border-muted">
          <CardHeader>
            <CardTitle>
              Resumo dos Selecionados 
              {(selectedCalcIds.size > 0 || selectedExpenseIds.size > 0) && 
                ` (${selectedTotals.days} cálculos, ${selectedTotals.expenseCount} gastos)`
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Faturado</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(selectedTotals.totalEarnings)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total KM</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {selectedTotals.totalKm} km
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Combustível</p>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(selectedTotals.fuelCost)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Gastos Adicionais</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(selectedTotals.totalExpenses)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(selectedTotals.finalNetProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label>Quantidade:</Label>
                <Select value={countFilter} onValueChange={(value: 'all' | '7' | '15' | '30' | '50') => setCountFilter(value)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Últimos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Período:</Label>
                <Select value={dateFilter} onValueChange={(value: 'all' | '7' | '15' | '30') => setDateFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="15">Últimos 15 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cálculos Diários */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cálculos Diários</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredCalculations.length > 0 && selectedCalcIds.size === filteredCalculations.length}
                    onCheckedChange={selectAllCalculations}
                  />
                  <Label>Selecionar todos ({filteredCalculations.length})</Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCalculations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {calculations.length === 0 
                  ? "Nenhum cálculo encontrado. Faça sua primeira calculação!"
                  : "Nenhum cálculo encontrado para o período selecionado."
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredCalculations.map((calculation) => (
                  <Card 
                    key={calculation.id} 
                    className={`relative cursor-pointer transition-all hover:shadow-lg ${
                      selectedCalcIds.has(calculation.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCalcSelection(calculation.id)}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedCalcIds.has(calculation.id)}
                        onCheckedChange={() => toggleCalcSelection(calculation.id)}
                      />
                    </div>
                    <CardHeader className="pt-8 pb-3">
                      <CardTitle className="text-lg font-bold">{formatDate(calculation.date)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="text-center mb-3">
                        <p className={`text-2xl font-bold ${calculation.net_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(calculation.net_profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Eficiência:</span>
                          <span className="font-medium">{calculation.km_per_liter} km/L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">KM Rodados:</span>
                          <span className="font-medium">{calculation.km_driven} km</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gastos Adicionais */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gastos Adicionais</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filteredExpenses.length > 0 && selectedExpenseIds.size === filteredExpenses.length}
                    onCheckedChange={selectAllExpenses}
                  />
                  <Label>Selecionar todos ({filteredExpenses.length})</Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {additionalExpenses.length === 0 
                  ? "Nenhum gasto adicional encontrado."
                  : "Nenhum gasto adicional encontrado para o período selecionado."
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredExpenses.map((expense) => (
                  <Card 
                    key={expense.id} 
                    className={`relative border-destructive/20 cursor-pointer transition-all hover:shadow-lg ${
                      selectedExpenseIds.has(expense.id) 
                        ? 'ring-2 ring-destructive bg-destructive/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleExpenseSelection(expense.id)}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedExpenseIds.has(expense.id)}
                        onCheckedChange={() => toggleExpenseSelection(expense.id)}
                      />
                    </div>
                    <CardHeader className="pt-8 pb-3">
                      <CardTitle className="text-lg font-bold text-destructive">{formatDate(expense.date)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="text-center mb-3">
                        <p className="text-xl font-bold text-destructive">-{formatCurrency(expense.total_cost)}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.maintenance_cost > 0 && "Manutenção"}
                          {expense.food_cost > 0 && "Alimentação"}
                          {expense.toll_cost > 0 && "Pedágio"}
                          {expense.parking_cost > 0 && "Estacionamento"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoryPage;