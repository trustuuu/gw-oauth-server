export async function getTokenExchangePolicyForClient(clientId) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM token_exchange_policies
      WHERE client_id = $1
        AND enabled = true
      LIMIT 1
    `,
    [clientId]
  );

  return rows[0] || null;
}
