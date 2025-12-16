import applicationService from "../service/application-service.js";

export function httpRun(response, fn, success, error, data) {
  return fn()
    .then((result) =>
      response
        .status(200)
        .send(data ? data : success ? success(result) : result)
    )
    .catch((err) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}

export function createPostHandler(serviceFn, serviceArgsFn, options = {}) {
  const { generateIdFn } = options;

  return (req, res) => {
    const payload = req.body;

    const makeRecord = (item) => {
      const finalId = generateIdFn ? generateIdFn(item) : item.id;

      return {
        ...item,
        id: finalId,
        whenCreated: new Date(),
        status: "New",
      };
    };

    const saveOne = (record) => {
      return serviceFn.setData.apply(
        serviceFn,
        [record].concat([...serviceArgsFn(req), record.id]) //[appPath, parentId, resourceName, record.id])
      );
    };

    // ----- ARRAY: save all at once -----
    if (Array.isArray(payload)) {
      const list = payload.map(makeRecord);
      const tasks = list.map(saveOne);
      return httpRun(res, () => Promise.all(tasks));
    }

    // ----- SINGLE OBJECT -----
    const record = makeRecord(payload);
    return httpRun(res, () => saveOne(record), undefined, undefined, record);
  };
}

//==========================================================
// has not used from below
//==========================================================

export function httpGetHandler(serviceFn, serviceArgsFn) {
  return (req, res) => {
    httpRun(res, () => serviceFn.apply(applicationService, serviceArgsFn(req)));
  };
}

export function httpPostHandler(serviceFn, buildDataFn, serviceArgsFn) {
  return (req, res) => {
    const body = req.body;

    if (Array.isArray(body)) {
      const ops = body.map((item) => {
        const data = buildDataFn(item);
        return serviceFn.apply(applicationService, [
          data,
          ...serviceArgsFn(req),
          data.id,
        ]);
      });

      return httpRun(res, () => Promise.all(ops));
    }

    const data = buildDataFn(body);

    return httpRun(
      res,
      () =>
        serviceFn.apply(applicationService, [
          data,
          ...serviceArgsFn(req),
          data.id,
        ]),
      null,
      null,
      data
    );
  };
}

export function httpPutHandler(serviceFn, serviceArgsFn) {
  return (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };

    return httpRun(
      res,
      () =>
        serviceFn.apply(applicationService, [
          ...serviceArgsFn(req),
          data.id,
          data,
        ]),
      null,
      null,
      data
    );
  };
}

export function httpDeleteHandler(serviceFn, serviceArgsFn) {
  return (req, res) => {
    const body = req.body;

    if (Array.isArray(body)) {
      const ops = body.map((item) =>
        serviceFn.apply(applicationService, [...serviceArgsFn(req), item.id])
      );

      return httpRun(res, () => Promise.all(ops));
    }

    return httpRun(res, () =>
      serviceFn.apply(applicationService, [
        ...serviceArgsFn(req),
        req.params.id,
      ])
    );
  };
}
