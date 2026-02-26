import 'reflect-metadata'

import { beforeAll, afterAll, test, expect } from 'vitest'

import { MikroORM } from '@mikro-orm/sqlite';
import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/decorators/legacy';

enum OnlineState {
  OFFLINE = 'offline',
  ONLINE  = 'online',
}

@Entity()
class User {

  @PrimaryKey({ type: 'integer' })
  id!: number;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'email', unique: true })
  email: string;

  // This throws with 'InvalidFieldNameException: no such column: online'
  @Enum({ items: () => OnlineState, default: OnlineState.OFFLINE, persist: false })
  onlineEnum: OnlineState = OnlineState.OFFLINE

  // This works partially, but by default is undefined
  @Property({ type: 'string', default: OnlineState.OFFLINE, persist: false })
  onlineString: OnlineState = OnlineState.OFFLINE

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refresh();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  // Create user
  orm.em.create(User, { name: 'Foo', email: 'bar', onlineEnum: OnlineState.OFFLINE, onlineString: OnlineState.OFFLINE })
  await orm.em.flush()
  orm.em.clear()

  // Find
  const user = await orm.em.findOneOrFail(User, { email: 'bfoor'})
  expect(user.onlineEnum).toBe(OnlineState.OFFLINE)
  expect(user.onlineString).toBe(OnlineState.OFFLINE)

  // Toggle state
  user.onlineEnum = OnlineState.ONLINE
  user.onlineString = OnlineState.ONLINE

  await orm.em.flush()
  orm.em.clear()

  // Find user and assert online state
  const testUser = await orm.em.findOneOrFail(User, { email: 'foo' })
  expect(testUser.onlineEnum).toBe(OnlineState.OFFLINE)
  expect(testUser.onlineString).toBe(OnlineState.OFFLINE) 
});
