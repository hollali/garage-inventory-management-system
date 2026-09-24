import { requireAdmin } from "@/lib/dal";
import { getAllShops, getAttendantList } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { deactivateAttendant, reactivateAttendant, deleteAttendant } from "@/lib/actions/admin";
import { AttendantModal } from "@/components/attendants/attendant-modal";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Attendants"
        description="Shop attendant accounts and their shop assignments."
        actions={
          <AttendantModal
            shops={shops}
            trigger={
              <Button>
                <Plus className="size-4" /> Add attendant
              </Button>
            }
          />
        }
      />

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
                  <TH className="hidden md:table-cell">Username</TH>
                  <TH>Shop</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {attendants.map(({ user, shops }) => (
                  <TR key={user.id}>
                    <TD>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </TD>
                    <TD className="hidden whitespace-nowrap md:table-cell">
                      <span className="font-mono text-sm">@{user.username}</span>
                    </TD>
                    <TD>
                      {shops.length === 0 ? (
                        <span className="text-muted">Unassigned</span>
                      ) : (
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {shops.map((s) => (
                            <Badge key={s.id} variant="neutral">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TD>
                    <TD>
                      {user.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Deactivated</Badge>
                      )}
                    </TD>
                    <TD className="hidden text-xs whitespace-nowrap text-muted md:table-cell">
                      {formatDate(user.createdAt)}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.active ? (
                          <ConfirmAction
                            action={deactivateAttendant}
                            hiddenFields={{ userId: user.id }}
                            confirmTitle="Deactivate this attendant?"
                            confirmBody={`${user.name} will be removed from their shop and won't be able to sign in.`}
                            successMessage="Attendant deactivated"
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
                            successMessage="Attendant reactivated"
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
                          successMessage="Attendant deleted"
                        >
                          <IconButton label="Delete" variant="danger">
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
