import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Calculator, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
}

const HistoryPage = () => {
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingCalc, setEditingCalc] = useState<Calculation | null>(null);
  const [editFormData, setEditFormData] = useState({
    total_earnings: "",
    km_driven: "",
    km_per_liter: "",
    fuel_price: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCalculations();
  }, []);

  const fetchCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .order('date', { ascending: false });

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

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCalculations(prev => prev.filter(calc => calc.id !== id));
      setSelectedIds(prev => {
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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === calculations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(calculations.map(calc => calc.id)));
    }
  };

  const getSelectedTotals = () => {
    const selectedCalcs = calculations.filter(calc => selectedIds.has(calc.id));
    return selectedCalcs.reduce(
      (acc, calc) => ({
        totalEarnings: acc.totalEarnings + calc.total_earnings,
        fuelCost: acc.fuelCost + calc.fuel_cost,
        netProfit: acc.netProfit + calc.net_profit,
        days: acc.days + 1,
      }),
      { totalEarnings: 0, fuelCost: 0, netProfit: 0, days: 0 }
    );
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
    return new Date(dateStr).toLocaleDateString('pt-BR');
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
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Histórico de Cálculos</h1>
          </div>
          <Button onClick={() => navigate('/')}>
            <Calculator className="w-4 h-4 mr-2" />
            Nova Calculação
          </Button>
        </div>

        {selectedIds.size > 0 && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Resumo dos Dias Selecionados ({selectedTotals.days} dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(selectedTotals.totalEarnings)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Combustível</p>
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(selectedTotals.fuelCost)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Lucro Líquido Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedTotals.netProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico Completo</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={calculations.length > 0 && selectedIds.size === calculations.length}
                  onCheckedChange={selectAll}
                />
                <Label>Selecionar todos</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calculations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cálculo encontrado. Faça sua primeira calculação!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Selecionar</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Faturamento</TableHead>
                      <TableHead>KM Rodados</TableHead>
                      <TableHead>Combustível</TableHead>
                      <TableHead>Lucro Líquido</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calculation) => (
                      <TableRow key={calculation.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(calculation.id)}
                            onCheckedChange={() => toggleSelection(calculation.id)}
                          />
                        </TableCell>
                        <TableCell>{formatDate(calculation.date)}</TableCell>
                        <TableCell>{formatCurrency(calculation.total_earnings)}</TableCell>
                        <TableCell>{calculation.km_driven} km</TableCell>
                        <TableCell>{formatCurrency(calculation.fuel_cost)}</TableCell>
                        <TableCell>
                          <span className={calculation.net_profit >= 0 ? "text-success" : "text-destructive"}>
                            {formatCurrency(calculation.net_profit)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(calculation)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Cálculo</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="edit-earnings">Faturamento do Dia (R$)</Label>
                                    <Input
                                      id="edit-earnings"
                                      type="number"
                                      step="0.01"
                                      value={editFormData.total_earnings}
                                      onChange={(e) => setEditFormData(prev => ({
                                        ...prev,
                                        total_earnings: e.target.value
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-km">KM Rodados no Dia</Label>
                                    <Input
                                      id="edit-km"
                                      type="number"
                                      step="0.1"
                                      value={editFormData.km_driven}
                                      onChange={(e) => setEditFormData(prev => ({
                                        ...prev,
                                        km_driven: e.target.value
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-efficiency">KM por Litro do Carro</Label>
                                    <Input
                                      id="edit-efficiency"
                                      type="number"
                                      step="0.1"
                                      value={editFormData.km_per_liter}
                                      onChange={(e) => setEditFormData(prev => ({
                                        ...prev,
                                        km_per_liter: e.target.value
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-fuel-price">Preço do Combustível (R$)</Label>
                                    <Input
                                      id="edit-fuel-price"
                                      type="number"
                                      step="0.01"
                                      value={editFormData.fuel_price}
                                      onChange={(e) => setEditFormData(prev => ({
                                        ...prev,
                                        fuel_price: e.target.value
                                      }))}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button onClick={updateCalculation} className="flex-1">
                                      Salvar Alterações
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setEditingCalc(null)}
                                      className="flex-1"
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCalculation(calculation.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoryPage;