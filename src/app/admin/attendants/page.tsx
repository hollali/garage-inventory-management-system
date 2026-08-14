import { requireAdmin } from "@/lib/dal";
import { getAllShops, getAttendantList } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { deactivateAttendant, reactivateAttendant, deleteAttendant } from "@/lib/actions/admin";
import { AttendantModal } from "@/components/attendants/attendant-modal";
import { ConfirmAction } from "@/components/confirm-action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export default async function AdminAttendantsPage() {
  await requireAdmin();
  const [attendants, shops] = await Promise.all([getAttendantList(), getAllShops()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Attendants</h1>
          <p className="text-sm text-muted">
            Shop attendant accounts and their shop assignments.
          </p>
        </div>
        <AttendantModal
          shops={shops}
          trigger={
            <Button>
              <Plus className="size-4" /> Add attendant
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>{attendants.length} attendant(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attendants.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted">
              No attendants yet. Create one to assign to a shop.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Attendant</TH>
                  <TH>Shop</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {attendants.map(({ user, shop }) => (
                  <TR key={user.id}>
                    <TD>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </TD>
                    <TD>{shop ? shop.name : <span className="text-muted">Unassigned</span>}</TD>
                    <TD>
                      {user.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Deactivated</Badge>
                      )}
                    </TD>
                    <TD className="text-xs text-muted">{formatDate(user.createdAt)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.active ? (
                          <ConfirmAction
                            action={deactivateAttendant}
                            hiddenFields={{ userId: user.id }}
                            confirmTitle="Deactivate this attendant?"
                            confirmBody={`${user.name} will be removed from their shop and won't be able to sign in.`}
                            buttonProps={{ className: "text-amber-600 hover:text-amber-700" }}
                          >
                            <IconButton
                              label="Deactivate"
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <ToggleRight className="size-4" />
                            </IconButton>
                          </ConfirmAction>
                        ) : (
                          <ConfirmAction
                            action={reactivateAttendant}
                            hiddenFields={{ userId: user.id }}
                            confirmTitle="Reactivate this attendant?"
                            confirmBody={`${user.name} will be able to sign in again.`}
                            buttonProps={{ className: "text-emerald-600 hover:text-emerald-700" }}
                          >
                            <IconButton
                              label="Reactivate"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <ToggleLeft className="size-4" />
                            </IconButton>
                          </ConfirmAction>
                        )}
                        <ConfirmAction
                          action={deleteAttendant}
                          hiddenFields={{ userId: user.id }}
                          confirmTitle="Delete this attendant?"
                          confirmBody={`${user.name}'s account will be permanently removed.`}
                          buttonProps={{ className: "text-red-600 hover:text-red-700" }}
                        >
                          <IconButton label="Delete" className="text-red-600 hover:text-red-700">
                            <Trash2 className="size-4" />
                          </IconButton>
                        </ConfirmAction>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
