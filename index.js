const { PrismaClient } = require('./generated/prisma/client');
const express = require('express');

let prisma = new PrismaClient();
let app = express();
app.use(express.json());

const PORT = 3000;

app.get('/problems/1', async (req, res) => {
    res.send(prisma.customer.findMany({
        where: { income: { gte: 50_000, lte: 60_000 } },
        orderBy: [
            { income: 'desc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
        ],
        select: { firstName: true, lastName: true, income: true },
        take: 10,
    }));
});

app.get('/problems/2', async (req, res) => {
    const employees = await prisma.employee.findMany({
        where: {
            Branch_Employee_branchNumberToBranch: {
                branchName: { in: ['London', 'Berlin'] }
            },
        },
        include: {
            Branch_Employee_branchNumberToBranch: {
                select: {
                    branchName: true,
                    // manager: { select: { salary: true } },
                    Employee_Branch_managerSINToEmployee: {
                        select: {
                            salary: true,
                        },
                    },
                },
            },
        },
    });

    res.send(employees
        .map((e) => ({
            sin: e.sin,
            branchName: e.Branch_Employee_branchNumberToBranch.branchName,
            salary: e.salary,
            diff: e.Branch_Employee_branchNumberToBranch.Employee_Branch_managerSINToEmployee.salary - e.salary,
        }))
        .sort((a, b) =>
            b.diff - a.diff || a.branchName.localeCompare(b.branchName),
        )
        .slice(0, 10));
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

    res.send(prisma.customer.findMany({
        where: { income: { gte: threshold } },
        select: { firstName: true, lastName: true, income: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 10,
    }));
});

app.get('/problems/4', async (req, res) => {
    const customers = await prisma.customer.findMany({
        where: { income: { gt: 80_000 } },
        include: {
            Owns: { include: { Account: { include: { Branch: true } } } },
        },
    });

    let qualified = [];

    customers.forEach((c) => {
        const branches = new Set(
            c.Owns.map((o) => o.Account.Branch.branchName),
        );
        if (branches.has('London') && branches.has('Latveria')) {
            c.Owns.forEach((o) =>
                qualified.push({
                    customerID: c.customerID,
                    income: c.income,
                    accNumber: o.accNumber,
                    branchNumber: o.Account.branchNumber,
                }),
            );
        }
    });

    res.send(qualified
        .sort(
            (a, b) =>
                a.customerID - b.customerID || a.accNumber - b.accNumber,
        )
        .slice(0, 10));
});

app.get('/problems/5', async (req, res) => {
    res.send(prisma.account.findMany({
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
            { owns: { _count: 'asc' } },
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
    ));
});

app.get('/problems/6', async (req, res) => {
    const branch = await prisma.branch.findFirstOrThrow({
        where: {
            Employee_Branch_managerSINToEmployee: {
                firstName: 'Phillip',
                lastName: 'Edwards',
            },
        },
        select: { branchNumber: true, branchName: true },
    });

    res.send(prisma.account.findMany({
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
    }));
});

app.get('/problems/7', async (req, res) => {
    res.send(prisma.customer.findMany({
        where: {
            Owns: {
                some: {
                    Account: { Branch: { branchName: 'New York' } },
                },
                none: {
                    Account: { Branch: { branchName: 'London' } },
                },
            },
            NOT: {
                Owns: {
                    some: {
                        Account: {
                            Owns: {
                                some: {
                                    Customer: {
                                        Owns: {
                                            some: {
                                                Account: {
                                                    Branch: { branchName: 'London' },
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
    }));
});

app.get('/problems/8', async (req, res) => {
    res.send(prisma.employee.findMany({
        where: { salary: { gt: 50_000 } },
        include: {
            branchManaged: { select: { branchName: true } },
        },
        orderBy: [
            { branchManaged: { branchName: 'desc' } },
            { firstName: 'asc' },
        ],
        take: 10,
    }));
});

app.get('/problems/9', async (req, res) => {
    const managers = await prisma.branch.findMany({
        select: { branchName: true, managerSIN: true },
    });
    const emp = await prisma.employee.findMany({
        where: { salary: { gt: 50_000 } },
        take: 10_000, // big but safe for demo ??????????????????????????????????????????/
    });

    res.send(emp
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
        .slice(0, 10));
});

app.get('/problems/10', async (req, res) => {
    const helenBranches = await prisma.branch.findMany({
        where: {
            Account: {
                some: {
                    Owns: {
                        some: {
                            Customer: {
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
            Owns: { some: {} },
        },
        include: {
            Owns: { include: { Account: { select: { branchNumber: true } } } },
        },
    });

    res.send(candidates
        .filter((c) => {
            const myBranches = new Set(c.Owns.map((o) => o.Account.branchNumber));
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
        })));
});

app.get('/problems/11', async (req, res) => {
    const minRow = await prisma.employee.aggregate({
        _min: { salary: true },
        where: { Branch_Employee_branchNumberToBranch: { branchName: 'Berlin' } },
    });
    const minSalary = minRow._min.salary ?? 0;

    res.send(prisma.employee.findMany({
        where: {
            salary: minSalary,
            Branch_Employee_branchNumberToBranch: { branchName: 'Berlin' },
        },
        select: { sin: true, firstName: true, lastName: true, salary: true },
        orderBy: { sin: 'asc' },
        take: 10,
    }));
});

app.get('/problems/14', async (req, res) => {
    const result = await prisma.employee.aggregate({
        _sum: { salary: true },
        where: { Branch_Employee_branchNumberToBranch: { branchName: 'Moscow' } },
    });
    res.send({ totalSalary: result._sum.salary ?? 0 });
});

app.get('/problems/15', async (req, res) => {
    const customers = await prisma.customer.findMany({
        include: {
            Owns: {
                include: { Account: { select: { branchNumber: true } } },
            },
        },
    });

    res.send(customers
        .filter(
            (c) =>
                new Set(c.Owns.map((o) => o.Account.branchNumber)).size === 4,
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
        .slice(0, 10));
});

app.get('/problems/17', async (req, res) => {
    res.send(prisma.customer.groupBy({
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
    ));
});

app.get('/problems/18', async (req, res) => {
    res.send(prisma.account.groupBy({
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
    ));
});

app.post('/employee/join', async (req, res) => {
    const { sin, firstName, lastName, salary, branchNumber } = req.body;
  
    if (!sin || !firstName || !lastName) {
        return res.status(400).json({ error: 'sin, firstName, lastName are required' });
    }
  
    try {
        const exists = await prisma.employee.findUnique({ where: { sin } });
        if (exists) {
          return res.status(409).json({ error: 'Employee with that SIN already exists' });
        }

        const newEmp = await prisma.employee.create({
            data: { sin, firstName, lastName, salary: salary ?? null, branchNumber: branchNumber ?? null },
        });


        res.status(201).json('이 팀은 미친듯이 일하는 일꾼들로 이루어진 광전사 설탕 노움 조합이다.\n분위기에 적응하기는 쉽지 않지만 아주 화력이 좋은 강력한 조합인거 같다.');
        return '이 팀은 미친듯이 일하는 일꾼들로 이루어진 광전사 설탕 노움 조합이다.\n분위기에 적응하기는 쉽지 않지만 아주 화력이 좋은 강력한 조합인거 같다.'
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/employee/leave', async (req, res) => {
    const { sin } = req.body;
    if (!sin) return res.status(400).json({ error: 'sin is required' });

    try {
        const employee = await prisma.employee.findUnique({ where: { sin } });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        await prisma.$transaction(async (tx) => {
            await tx.branch.updateMany({ where: { managerSIN: sin }, data: { managerSIN: null }});

            await tx.employee.delete({ where: { sin } });
        });

        res.json('안녕히 계세요 여러분!\n전 이 세상의 모든 굴레와 속박을 벗어 던지고 제 행복을 찾아 떠납니다!\n여러분도 행복하세요~~!');
        return '안녕히 계세요 여러분!\n전 이 세상의 모든 굴레와 속박을 벗어 던지고 제 행복을 찾아 떠납니다!\n여러분도 행복하세요~~!';
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

async function nextTransNumber(accNumber) {
    const agg = await prisma.transactions.aggregate({
        where: { accNumber },
        _max:  { transNumber: true },
    });
    return (agg._max.transNumber ?? 0) + 1;
}

app.post('/account/:accNumber/deposit', async (req, res) => {
    const accNumber = parseInt(req.params.accNumber, 10);
    const amount    = Number(req.body.amount);

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Positive numeric amount required' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const account = await tx.account.findUnique({ where: { accNumber } });
            if (!account) throw new Error('Account not found');

            const newBalance = (Number(account.balance ?? 0) + amount).toString();

            await tx.account.update({
                where: { accNumber },
                data:  { balance: newBalance },
            });

            await tx.transactions.create({
                data: {
                accNumber,
                transNumber: await nextTransNumber(accNumber),
                amount: amount.toString(),
                },
            });

            return { accNumber, newBalance };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(err.message === 'Account not found' ? 404 : 500).json({ error: err.message });
    }
});

app.post('/account/:accNumber/withdraw', async (req, res) => {
    const accNumber = parseInt(req.params.accNumber, 10);
    const amount    = Number(req.body.amount);

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Positive numeric amount required' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
        const account = await tx.account.findUnique({ where: { accNumber } });
        if (!account) throw new Error('Account not found');

        const curBalance = Number(account.balance ?? 0);
        if (curBalance < amount) throw new Error('Insufficient funds');

        const newBalance = (curBalance - amount).toString();

        await tx.account.update({
            where: { accNumber },
            data:  { balance: newBalance },
        });

        await tx.transactions.create({
            data: {
                accNumber,
                transNumber: await nextTransNumber(accNumber),
                amount: (-amount).toString(),
            },
        });

        return { accNumber, newBalance };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        const code = err.message === 'Account not found' ? 404
                    : err.message === 'Insufficient funds' ? 400
                    : 500;
        res.status(code).json({ error: err.message });
    }
});
  

app.listen(PORT);