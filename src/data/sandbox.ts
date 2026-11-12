export interface SandboxExample {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  code: string;
  stdin?: string[];
}

export const SANDBOX_EXAMPLES: SandboxExample[] = [
  {
    id: 'dragon',
    title: 'The Pet Dragon',
    subtitle: 'classes · self · __str__',
    icon: '🐲',
    color: '#00F5D4',
    code: `class Dragon:
    def __init__(self, name, power):
        self.name = name
        self.power = power

    def __str__(self):
        return f"{self.name} ({self.power} HP)"

pyro = Dragon("Pyro", 99)
print(pyro)
print("ready to burn")
`,
  },
  {
    id: 'train',
    title: 'Cargo Train',
    subtitle: 'lists · append · pop',
    icon: '🚂',
    color: '#FF9F1C',
    code: `loot = ["core", "gear"]
loot.append("crown")
loot.append("star")
print(loot)

fallen = loot.pop()
print(f"launched: {fallen}")
print(loot)
`,
  },
  {
    id: 'loops',
    title: 'Loop Factory',
    subtitle: 'for · range · f-strings',
    icon: '🏭',
    color: '#5EFF8F',
    code: `for n in range(1, 6):
    print(f"cycle {n}: machine online")
`,
  },
  {
    id: 'vault',
    title: 'Vending Vault',
    subtitle: 'dicts · keys · loops',
    icon: '🥤',
    color: '#FEE440',
    code: `hero = {"name": "Nova", "level": 7, "power": 99}

for key in ["name", "level", "power"]:
    print(key, "->", hero[key])
`,
  },
  {
    id: 'recursion',
    title: 'Recursion Spiral',
    subtitle: 'recursion · call stack',
    icon: '🗼',
    color: '#9D4EDD',
    code: `def countdown(n):
    if n <= 0:
        return "LIFTOFF"
    print(n)
    return countdown(n - 1)

print(countdown(4))
`,
  },
  {
    id: 'generator',
    title: 'Generator Fountain',
    subtitle: 'yield · lazy pipelines',
    icon: '⛲',
    color: '#4CC9F0',
    code: `def fountain():
    for n in range(1, 6):
        yield n ** 2

print(list(fountain()))
`,
  },
  {
    id: 'nebula',
    title: 'Comprehension Nebula',
    subtitle: 'comprehensions · join',
    icon: '🔮',
    color: '#FF2A85',
    code: `stars = [f"star-{i}" for i in range(1, 7)]
print(",".join(stars))
`,
  },
  {
    id: 'net',
    title: 'Safety Net',
    subtitle: 'try · except · finally',
    icon: '🕸️',
    color: '#FEE440',
    code: `try:
    print(1 / 0)
except ZeroDivisionError as error:
    print("caught:", error)
finally:
    print("safety net closed")
`,
  },
  {
    id: 'hello',
    title: 'The Listening Tube',
    subtitle: 'input · f-strings',
    icon: '👂',
    color: '#00F5D4',
    code: `name = input("Name: ")
print(f"Hello, {name}! Welcome to the sandbox.")
`,
    stdin: ['Nova'],
  },
];

export const SANDBOX_STARTER = `# SANDBOX · anything goes
# Try a class, a loop, a generator — the stage follows.

name = "Nova"
power = 99

for level in range(1, 4):
    print(f"{name} charges to level {level}")

print(f"FINAL POWER: {power}")
`;
