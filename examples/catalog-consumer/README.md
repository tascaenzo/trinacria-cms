# Catalog consumer

A separate plugin with no catalog implementation dependency. Its protected event
subscription needs an exact approved C2 grant. The optional inspect operation also
needs an approved catalog `items.get` API grant. Both checks are fresh at execution.
Durable event observations use storage already bound to the inbox transaction.
