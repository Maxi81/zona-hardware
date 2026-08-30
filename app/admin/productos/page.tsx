import { requireRole } from "@/lib/auth/guards";
import {
  getCategorias,
  getMarcas,
  getProductosAdmin,
  getDepositos,
  getStockAdmin,
} from "@/lib/productos/actions";
import { CategoriasMarcasForm } from "@/components/productos/categorias-marcas-form";
import { NuevoProductoForm } from "@/components/productos/nuevo-producto-form";
import { ProductosTable } from "@/components/productos/productos-table";
import { StockForm } from "@/components/productos/stock-form";

export default async function ProductosPage() {
  await requireRole(["administrador"]);

  const [categorias, marcas, productos, depositos, stock] = await Promise.all([
    getCategorias(),
    getMarcas(),
    getProductosAdmin(),
    getDepositos(),
    getStockAdmin(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogo y precios</h1>
        <p className="text-sm text-muted-foreground">
          Un producto nuevo queda en borrador hasta que lo publicás. Al darlo
          de baja desaparece del catálogo pero se conserva para pedidos
          históricos.
        </p>
      </div>
      <CategoriasMarcasForm categorias={categorias} marcas={marcas} />
      <NuevoProductoForm categorias={categorias} marcas={marcas} />
      <ProductosTable productos={productos} />
      <StockForm productos={productos} depositos={depositos} stock={stock} />
    </div>
  );
}
