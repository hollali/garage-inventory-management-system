import { requireAdmin } from "@/lib/dal";
import { getSuppliers } from "@/lib/queries/purchasing";
import { deleteSupplier } from "@/lib/actions/purchasing";
import { SupplierModal } from "@/components/purchasing/supplier-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export default async function AdminSuppliersPage() {
  await requireAdmin();
  const suppliers = await getSuppliers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} supplier${
          suppliers.length === 1 ? "" : "s"
        } · used to create purchase orders.`}
        actions={
          <SupplierModal
            urlAction="add"
            trigger={
              <Button>
                <Plus className="size-4" /> New supplier
              </Button>
            }
          />
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No suppliers yet"
          description="Add your first supplier so you can create purchase orders."
          action={
            <SupplierModal
              trigger={
                <Button>
                  <Plus className="size-4" /> Add supplier
                </Button>
              }
            />
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH className="hidden md:table-cell">Contact</TH>
                  <TH>Phone / Email</TH>
                  <TH className="text-right">Purchase orders</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {suppliers.map((supplier) => (
                  <TR key={supplier.id}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{supplier.name}</span>
                      {supplier.notes && (
                        <span className="ml-2 text-xs text-muted">{supplier.notes}</span>
                      )}
                    </TD>
                    <TD className="hidden md:table-cell">
                      {supplier.contactName || <span className="text-muted">—</span>}
                    </TD>
                    <TD>
                      <div className="flex flex-col">
                        {supplier.phone && <span className="tabular-nums">{supplier.phone}</span>}
                        {supplier.email && <span className="text-muted">{supplier.email}</span>}
                        {!supplier.phone && !supplier.email && <span className="text-muted">—</span>}
                      </div>
                    </TD>
                    <TD className="text-right whitespace-nowrap tabular-nums">{supplier.purchaseOrderCount}</TD>
                    <TD className="text-right">
                      <ConfirmAction
                        action={deleteSupplier}
                        hiddenFields={{ supplierId: supplier.id }}
                        confirmTitle="Delete this supplier?"
                        confirmBody={`"${supplier.name}" will be removed. Existing purchase orders keep their records.`}
                        successMessage="Supplier deleted"
                      >
                        <IconButton label="Delete" variant="danger">
                          <Trash2 className="size-4" />
                        </IconButton>
                      </ConfirmAction>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
