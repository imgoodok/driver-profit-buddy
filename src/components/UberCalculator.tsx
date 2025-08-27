import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Car, Fuel, DollarSign } from "lucide-react";

interface CalculationData {
  totalEarnings: number;
  kmDriven: number;
  kmPerLiter: number;
  fuelPrice: number;
}

interface CalculationResults {
  litersConsumed: number;
  fuelCost: number;
  netProfit: number;
}

const UberCalculator = () => {
  const [data, setData] = useState<CalculationData>({
    totalEarnings: 0,
    kmDriven: 0,
    kmPerLiter: 0,
    fuelPrice: 0,
  });

  const [results, setResults] = useState<CalculationResults | null>(null);

  const handleInputChange = (field: keyof CalculationData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => ({ ...prev, [field]: numValue }));
  };

  const calculateResults = () => {
    const litersConsumed = data.kmDriven / data.kmPerLiter;
    const fuelCost = litersConsumed * data.fuelPrice;
    const netProfit = data.totalEarnings - fuelCost;

    setResults({
      litersConsumed: Math.round(litersConsumed * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    });
  };

  const canCalculate = data.totalEarnings > 0 && data.kmDriven > 0 && data.kmPerLiter > 0 && data.fuelPrice > 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Car className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Calculadora Uber</h1>
          </div>
          <p className="text-muted-foreground">
            Calcule seus ganhos líquidos e gasto com combustível
          </p>
        </div>

        {/* Input Form */}
        <Card className="p-6 space-y-4 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Dados do Dia
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalEarnings">Valor Total Faturado (R$)</Label>
              <Input
                id="totalEarnings"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={data.totalEarnings || ""}
                onChange={(e) => handleInputChange("totalEarnings", e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kmDriven">Quilômetros Rodados</Label>
              <Input
                id="kmDriven"
                type="number"
                step="0.1"
                placeholder="0"
                value={data.kmDriven || ""}
                onChange={(e) => handleInputChange("kmDriven", e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kmPerLiter">KM por Litro do Carro</Label>
              <Input
                id="kmPerLiter"
                type="number"
                step="0.1"
                placeholder="0,0"
                value={data.kmPerLiter || ""}
                onChange={(e) => handleInputChange("kmPerLiter", e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fuelPrice">Preço do Combustível (R$/L)</Label>
              <Input
                id="fuelPrice"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={data.fuelPrice || ""}
                onChange={(e) => handleInputChange("fuelPrice", e.target.value)}
                className="text-lg"
              />
            </div>
          </div>
          
          <Button
            onClick={calculateResults}
            disabled={!canCalculate}
            className="w-full text-lg py-6"
            size="lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Calcular Relatório
          </Button>
        </Card>

        {/* Results */}
        {results && (
          <Card className="p-6 space-y-4 shadow-[var(--shadow-elevated)]">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Relatório do Dia
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Fuel className="w-5 h-5 text-warning" />
                  <span className="font-medium">Combustível Consumido</span>
                </div>
                <p className="text-2xl font-bold text-warning">
                  {results.litersConsumed.toFixed(2)} L
                </p>
              </div>
              
              <div className="bg-destructive/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-destructive" />
                  <span className="font-medium">Gasto com Combustível</span>
                </div>
                <p className="text-2xl font-bold text-destructive">
                  R$ {results.fuelCost.toFixed(2)}
                </p>
              </div>
              
              <div className={`rounded-lg p-4 text-center ${results.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className={`w-5 h-5 ${results.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
                  <span className="font-medium">Lucro Líquido</span>
                </div>
                <p className={`text-2xl font-bold ${results.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {results.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Resumo:</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Você faturou R$ {data.totalEarnings.toFixed(2)} hoje</p>
                <p>• Rodou {data.kmDriven} km consumindo {results.litersConsumed.toFixed(2)} litros</p>
                <p>• Gastou R$ {results.fuelCost.toFixed(2)} com combustível</p>
                <p className={results.netProfit >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                  • Seu lucro líquido foi de R$ {results.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UberCalculator;