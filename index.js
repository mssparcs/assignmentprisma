const PrismaClient = require('@prisma/client');
const express = require('express');

let prisma = new PrismaClient();
let app = express();
app.use(express.json());

const PORT = 3000;

app.get('/problems/1', async (req, res) => {
    return prisma.customer.findMany({
        where: { income: { gte: 50_000, lte: 60_000 } },
        orderBy: [
            { income: 'desc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
        ],
        select: { firstName: true, lastName: true, income: true },
        take: 10,
    });
});

app.get('/problems/2', async (req, res) => {
    const employees = await prisma.employee.findMany({
        where: {
            branch: { branchName: { in: ['London', 'Berlin'] } },
        },
        include: {
            branch: {
                select: {
                    branchName: true,
                    manager: { select: { salary: true } },
                },
            },
        },
    });

    return employees
        .map((e) => ({
            sin: e.sin,
            branchName: e.branch.branchName,
            salary: e.salary,
            diff: e.branch.manager.salary - e.salary,
        }))
        .sort((a, b) =>
            b.diff - a.diff || a.branchName.localeCompare(b.branchName),
        )
        .slice(0, 10);
});

app.get('/problems/3', async (req, res) => {
    const butlerIncomes = await prisma.customer.findMany({
        where: { lastName: 'Butler' },
        select: { income: true },
    });
    const threshold = butlerIncomes.reduce(
        (m, c) => Math.max(m, c.income),
        0,
    ) * 2;

    return prisma.customer.findMany({
        where: { income: { gte: threshold } },
        select: { firstName: true, lastName: true, income: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 10,
    });
});

app.get('/problems/4', async (req, res) => {
    const customers = await prisma.customer.findMany({
        where: { income: { gt: 80_000 } },
        include: {
            owns: { include: { account: { include: { branch: true } } } },
        },
    });

    let qualified = [];

    customers.forEach((c) => {
        const branches = new Set(
            c.owns.map((o) => o.account.branch.branchName),
        );
        if (branches.has('London') && branches.has('Latveria')) {
            c.owns.forEach((o) =>
                qualified.push({
                    customerID: c.customerID,
                    income: c.income,
                    accNumber: o.accNumber,
                    branchNumber: o.account.branchNumber,
                }),
            );
        }
    });

    return qualified
        .sort(
            (a, b) =>
                a.customerID - b.customerID || a.accNumber - b.accNumber,
        )
        .slice(0, 10);
});

app.get('/problems/5', async (req, res) => {
    return prisma.account.findMany({
        where: {
            type: { in: ['BUS', 'SAV'] },
            owns: { some: {} },
        },
        select: {
            type: true,
            accNumber: true,
            balance: true,
            owns: { select: { customerID: true } },
        },
        orderBy: [
            { owns: { _count: 'asc' } }, // will be re-sorted below
            { type: 'asc' },
            { accNumber: 'asc' },
        ],
    }).then((rows) =>
        rows
            .flatMap((a) =>
                a.owns.map((o) => ({
                    customerID: o.customerID,
                    type: a.type,
                    accNumber: a.accNumber,
                    balance: a.balance,
                })),
            )
            .sort(
                (x, y) =>
                    x.customerID - y.customerID ||
                    x.type.localeCompare(y.type) ||
                    x.accNumber - y.accNumber,
            )
            .slice(0, 10),
    );
});

app.get('/problems/6', async (req, res) => {
    const branch = await prisma.branch.findFirstOrThrow({
        where: {
            manager: {
                firstName: 'Phillip',
                lastName: 'Edwards',
            },
        },
        select: { branchNumber: true, branchName: true },
    });

    return prisma.account.findMany({
        where: {
            branchNumber: branch.branchNumber,
            balance: { gt: 100_000 },
        },
        select: {
            branch: { select: { branchName: true } },
            accNumber: true,
            balance: true,
        },
        orderBy: { accNumber: 'asc' },
        take: 10,
    });
});

/* --------------------------------------------------------------- */
/*  Problem 7 — New York only, no London owners or co-owners       */
/* --------------------------------------------------------------- */
app.get('/problems/7', async (req, res) => {
    return prisma.customer.findMany({
        where: {
            owns: {
                some: {
                    account: { branch: { branchName: 'New York' } },
                },
                none: {
                    account: { branch: { branchName: 'London' } },
                },
            },
            // no co-owner of any shared account may own London:
            NOT: {
                owns: {
                    some: {
                        account: {
                            owns: {
                                some: {
                                    customer: {
                                        owns: {
                                            some: {
                                                account: {
                                                    branch: { branchName: 'London' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        select: { customerID: true },
        orderBy: { customerID: 'asc' },
        take: 10,
    });
});

app.get('/problems/8', async (req, res) => {
    return prisma.employee.findMany({
        where: { salary: { gt: 50_000 } },
        include: {
            branchManaged: { select: { branchName: true } },
        },
        orderBy: [
            { branchManaged: { branchName: 'desc' } },
            { firstName: 'asc' },
        ],
        take: 10,
    });
});

app.get('/problems/9', async (req, res) => {
    const managers = await prisma.branch.findMany({
        select: { branchName: true, managerSIN: true },
    });
    const emp = await prisma.employee.findMany({
        where: { salary: { gt: 50_000 } },
        take: 10_000, // big but safe for demo ??????????????????????????????????????????/
    });

    return emp
        .map((e) => ({
            ...e,
            branchName:
                managers.find((m) => m.managerSIN === e.sin)?.branchName ?? null,
        }))
        .sort(
            (a, b) =>
                (b.branchName ?? '').localeCompare(a.branchName ?? '') ||
                a.firstName.localeCompare(b.firstName),
        )
        .slice(0, 10);
});

app.get('/problems/10', async (req, res) => {
    const helenBranches = await prisma.branch.findMany({
        where: {
            accounts: {
                some: {
                    owns: {
                        some: {
                            customer: {
                                firstName: 'Helen',
                                lastName: 'Morgan',
                            },
                        },
                    },
                },
            },
        },
        select: { branchNumber: true },
    });
    const branchSet = new Set(helenBranches.map((b) => b.branchNumber));

    const candidates = await prisma.customer.findMany({
        where: {
            OR: [
                { income: { gt: 5_000 } },
                { firstName: 'Helen', lastName: 'Morgan' },
            ],
            owns: { some: {} },
        },
        include: {
            owns: { include: { account: { select: { branchNumber: true } } } },
        },
    });

    return candidates
        .filter((c) => {
            const myBranches = new Set(c.owns.map((o) => o.account.branchNumber));
            for (const b of branchSet) if (!myBranches.has(b)) return false;
            return true;
        })
        .sort((a, b) => (b.income ?? 0) - (a.income ?? 0))
        .slice(0, 10)
        .map(({ customerID, firstName, lastName, income }) => ({
            customerID,
            firstName,
            lastName,
            income,
        }));
});

app.get('/problems/11', async (req, res) => {
    const minRow = await prisma.employee.aggregate({
        _min: { salary: true },
        where: { branch: { branchName: 'Berlin' } },
    });
    const minSalary = minRow._min.salary ?? 0;

    return prisma.employee.findMany({
        where: {
            salary: minSalary,
            branch: { branchName: 'Berlin' },
        },
        select: { sin: true, firstName: true, lastName: true, salary: true },
        orderBy: { sin: 'asc' },
        take: 10,
    });
});

app.get('/problems/14', async (req, res) => {
    const res = await prisma.employee.aggregate({
        _sum: { salary: true },
        where: { branch: { branchName: 'Moscow' } },
    });
    return { totalSalary: res._sum.salary ?? 0 };
});

app.get('/problems/15', async (req, res) => {
    const customers = await prisma.customer.findMany({
        include: {
            owns: {
                include: { account: { select: { branchNumber: true } } },
            },
        },
    });

    return customers
        .filter(
            (c) =>
                new Set(c.owns.map((o) => o.account.branchNumber)).size === 4,
        )
        .map(({ customerID, firstName, lastName }) => ({
            customerID,
            firstName,
            lastName,
        }))
        .sort(
            (a, b) =>
                a.lastName.localeCompare(b.lastName) ||
                a.firstName.localeCompare(b.firstName),
        )
        .slice(0, 10);
});

app.get('/problems/17', async (req, res) => {
    return prisma.customer.groupBy({
        by: ['customerID', 'firstName', 'lastName', 'income'],
        where: { lastName: { startsWith: 'S', contains: 'e' } },
        _count: { _all: true },
        _avg: { owns: { account: { balance: true } } },
        having: { _count: { _all: { gte: 3 } } },
        orderBy: { customerID: 'asc' },
        take: 10,
    }).then((rows) =>
        rows.map((r) => ({
            customerID: r.customerID,
            firstName: r.firstName,
            lastName: r.lastName,
            income: r.income,
            avgBalance: r._avg.owns?.account?.balance ?? 0,
        })),
    );
});

app.get('/problems/18', async (req, res) => {
    return prisma.account.groupBy({
        by: ['accNumber', 'balance'],
        where: { branch: { branchName: 'Berlin' } },
        _count: { transactions: true },
        _sum: { transactions: { amount: true } },
        having: { _count: { transactions: { gte: 10 } } },
        orderBy: { _sum: { transactions: { amount: 'asc' } } },
        take: 10,
    }).then((rows) =>
        rows.map((r) => ({
            accNumber: r.accNumber,
            balance: r.balance,
            txnSum: r._sum.transactions?.amount ?? 0,
        })),
    );
});

app.get('/problems/19', async (req, res) => {
    const bigBranches = await prisma.branch.groupBy({
        by: ['branchNumber', 'branchName'],
        _count: { accounts: true },
        having: { _count: { accounts: { gte: 50 } } },
    });

    return prisma.account.groupBy({
        by: ['type', 'branchNumber'],
        where: {
            branchNumber: { in: bigBranches.map((b) => b.branchNumber) },
        },
        _avg: { transactions: { amount: true } },
    }).then((rows) =>
        rows
            .map((r) => ({
                branchName:
                    bigBranches.find((b) => b.branchNumber === r.branchNumber)
                        .branchName,
                accountType: r.type,
                avgTxn: r._avg.transactions?.amount ?? 0,
            }))
            .sort(
                (a, b) =>
                    a.branchName.localeCompare(b.branchName) ||
                    a.accountType.localeCompare(b.accountType),
            )
            .slice(0, 10),
    );
});

app.get('/problems/20', async (req, res) => {
    const typeAverages = await prisma.account.groupBy({
        by: ['type'],
        _avg: { transactions: { amount: true } },
    });
    let overall = {};
    typeAverages.forEach(
        (t) => (overall[t.type] = t._avg.transactions?.amount ?? 0),
    );

    const acctAvg = await prisma.account.groupBy({
        by: ['accNumber', 'type'],
        _avg: { transactions: { amount: true } },
    });

    const qualifyingNumbers = acctAvg
        .filter((a) => a._avg.transactions.amount > 3 * overall[a.type])
        .map((a) => a.accNumber);

    return prisma.transactions.findMany({
        where: { accNumber: { in: qualifyingNumbers } },
        include: {
            account: { select: { type: true } },
        },
        orderBy: [
            { account: { type: 'asc' } },
            { accNumber: 'asc' },
            { transNumber: 'asc' },
        ],
        take: 10,
    }).then((txns) =>
        txns.map((t) => ({
            accountType: t.account.type,
            accNumber: t.accNumber,
            transNumber: t.transNumber,
            amount: t.amount,
        })),
    );
});

app.listen(PORT);