const cfg = window.LEX_CONFIG || {};

if (!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Falta configurar SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en config.js"
  );
}

const { createClient } = await import(
  "https://esm.sh/@supabase/supabase-js@2"
);

export const supabase = createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const isDemo = false;
export const bucket = null;

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function assertNoError(error) {
  if (error) throw error;
}

export async function authSession() {
  const { data, error } =
    await supabase.auth.getSession();

  assertNoError(error);

  return data.session;
}

export async function login(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  assertNoError(error);

  return data;
}

export async function logout() {
  const { error } =
    await supabase.auth.signOut();

  assertNoError(error);
}

export async function loadAll() {
  const [
    clients,
    cases,
    actions,
    tasks,
    documents,
    fees
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("created_at", {
        ascending: true
      }),

    supabase
      .from("cases")
      .select("*")
      .order("created_at", {
        ascending: true
      }),

    supabase
      .from("actions")
      .select("*")
      .order("action_date", {
        ascending: false
      }),

    supabase
      .from("tasks")
      .select("*")
      .order("due_date", {
        ascending: true
      }),

    supabase
      .from("documents")
      .select("*")
      .is("archived_at", null)
      .order("created_at", {
        ascending: false
      }),

    supabase
      .from("fee_movements")
      .select("*")
      .order("movement_date", {
        ascending: false
      })
  ]);

  for (const result of [
    clients,
    cases,
    actions,
    tasks,
    documents,
    fees
  ]) {
    assertNoError(result.error);
  }

  return {
    clients: clients.data || [],
    cases: cases.data || [],
    actions: actions.data || [],
    tasks: tasks.data || [],
    documents: documents.data || [],
    fee_movements: fees.data || []
  };
}

export async function upsertClient(obj) {
  const payload = {
    ...obj
  };

  if (!payload.id) {
    payload.id = randomId("CL");
  }

  const { error } =
    await supabase
      .from("clients")
      .upsert(payload, {
        onConflict: "id"
      });

  assertNoError(error);
}

export async function upsertCase(obj) {
  const payload = {
    ...obj
  };

  if (!payload.id) {
    payload.id = randomId("CAS");
  }

  const { error } =
    await supabase
      .from("cases")
      .upsert(payload, {
        onConflict: "id"
      });

  assertNoError(error);
}

export async function addAction(
  obj,
  files = []
) {
  if (files.length) {
    throw new Error(
      "Los documentos todavía no están conectados a Google Drive. Guardá la actuación sin adjuntos por ahora."
    );
  }

  const actionId =
    obj.id || randomId("A");

  const payload = {
    ...obj,
    id: actionId
  };

  const { error: actionError } =
    await supabase
      .from("actions")
      .insert(payload);

  assertNoError(actionError);

  const update = {
    last_action: obj.action_date
  };

  if (obj.status_to) {
    update.status = obj.status_to;
  }

  if (obj.priority_to) {
    update.priority = obj.priority_to;
  }

  if (obj.risk_to) {
    update.risk = obj.risk_to;
  }

  const { error: caseError } =
    await supabase
      .from("cases")
      .update(update)
      .eq("id", obj.case_id);

  assertNoError(caseError);

  return actionId;
}

export async function addTask(obj) {
  const { error } =
    await supabase
      .from("tasks")
      .insert(obj);

  assertNoError(error);
}

export async function toggleTask(
  id,
  status
) {
  const next =
    status === "Completada"
      ? "Pendiente"
      : "Completada";

  const { error } =
    await supabase
      .from("tasks")
      .update({
        status: next
      })
      .eq("id", id);

  assertNoError(error);
}

export async function addFeeMovement(
  obj
) {
  const { error: movementError } =
    await supabase
      .from("fee_movements")
      .insert(obj);

  assertNoError(movementError);

  if (obj.type === "Cobro") {
    const {
      data: currentCase,
      error: readError
    } = await supabase
      .from("cases")
      .select("collected,billed")
      .eq("id", obj.case_id)
      .single();

    assertNoError(readError);

    const collected =
      Number(
        currentCase?.collected || 0
      ) +
      Number(obj.amount || 0);

    const billed =
      Math.max(
        Number(
          currentCase?.billed || 0
        ),
        collected
      );

    const { error: updateError } =
      await supabase
        .from("cases")
        .update({
          collected,
          billed
        })
        .eq("id", obj.case_id);

    assertNoError(updateError);
  }
}

export async function signedDocumentUrl(
  url
) {
  if (!url) {
    throw new Error(
      "Este documento todavía no tiene un vínculo de Google Drive."
    );
  }

  return url;
}

export async function archiveDocument(
  id
) {
  const { error } =
    await supabase
      .from("documents")
      .update({
        archived_at:
          new Date().toISOString()
      })
      .eq("id", id);

  assertNoError(error);
}
export async function deleteTask(id) {

  const { error } =
    await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

  assertNoError(error);
}


export async function deleteDocument(id) {

  const { error } =
    await supabase
      .from("documents")
      .delete()
      .eq("id", id);

  assertNoError(error);
}


export async function deleteAction(id) {

  const { error } =
    await supabase
      .from("actions")
      .delete()
      .eq("id", id);

  assertNoError(error);
}


export async function deleteCase(id) {

  const { error } =
    await supabase
      .from("cases")
      .delete()
      .eq("id", id);

  assertNoError(error);
}


export async function deleteClient(id) {

  const { error } =
    await supabase
      .from("clients")
      .delete()
      .eq("id", id);

  assertNoError(error);
}
export function resetDemo() {
  // Sin uso desde que Supabase
  // es la memoria oficial.
}
